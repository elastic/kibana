/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSmoothStepPath, Position } from '@xyflow/react';
import { useCallback, useEffect, useState, type RefObject } from 'react';

export type SpotlightWireSide = 'incoming' | 'outgoing';

export interface SpotlightWireSpec {
  id: string;
  side: SpotlightWireSide;
  relation: string;
  groupKey: string;
}

export interface SpotlightWirePath {
  id: string;
  path: string;
  relation: string;
  pillX: number;
  pillY: number;
  side: SpotlightWireSide;
}

const spreadHeroAnchorY = (index: number, total: number, top: number, height: number): number => {
  if (total <= 1) {
    return top + height / 2;
  }
  return top + (height * (index + 1)) / (total + 1);
};

const buildPathsForSide = (
  containerRect: DOMRect,
  heroRect: DOMRect,
  specs: readonly SpotlightWireSpec[],
  getGroupElement: (groupKey: string) => HTMLElement | undefined,
  side: SpotlightWireSide
): SpotlightWirePath[] => {
  const sideSpecs = specs.filter((spec) => spec.side === side);
  if (sideSpecs.length === 0) {
    return [];
  }

  const heroLeft = heroRect.left - containerRect.left;
  const heroRight = heroRect.right - containerRect.left;
  const heroTop = heroRect.top - containerRect.top;
  const heroHeight = heroRect.height;

  const paths: SpotlightWirePath[] = [];

  sideSpecs.forEach((spec, index) => {
    const groupEl = getGroupElement(spec.groupKey);
    if (groupEl === undefined) {
      return;
    }

    const groupRect = groupEl.getBoundingClientRect();
    const groupCenterY = groupRect.top + groupRect.height / 2 - containerRect.top;

    let sourceX: number;
    let sourceY: number;
    let targetX: number;
    let targetY: number;
    let sourcePosition: Position;
    let targetPosition: Position;

    if (side === 'incoming') {
      sourceX = groupRect.right - containerRect.left;
      sourceY = groupCenterY;
      targetX = heroLeft;
      targetY = spreadHeroAnchorY(index, sideSpecs.length, heroTop, heroHeight);
      sourcePosition = Position.Right;
      targetPosition = Position.Left;
    } else {
      sourceX = heroRight;
      sourceY = spreadHeroAnchorY(index, sideSpecs.length, heroTop, heroHeight);
      targetX = groupRect.left - containerRect.left;
      targetY = groupCenterY;
      sourcePosition = Position.Right;
      targetPosition = Position.Left;
    }

    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });

    paths.push({
      id: spec.id,
      path,
      relation: spec.relation,
      pillX: labelX,
      pillY: labelY,
      side,
    });
  });

  return paths;
};

export const useSpotlightWires = (
  containerRef: RefObject<HTMLElement | null>,
  heroRef: RefObject<HTMLElement | null>,
  specs: readonly SpotlightWireSpec[],
  getGroupElement: (groupKey: string) => HTMLElement | undefined,
  layoutRevision: number
): readonly SpotlightWirePath[] => {
  const [paths, setPaths] = useState<readonly SpotlightWirePath[]>([]);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const hero = heroRef.current;
    if (container === null || hero === null) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();

    const incoming = buildPathsForSide(containerRect, heroRect, specs, getGroupElement, 'incoming');
    const outgoing = buildPathsForSide(containerRect, heroRect, specs, getGroupElement, 'outgoing');
    setPaths([...incoming, ...outgoing]);
  }, [containerRef, heroRef, specs, getGroupElement]);

  useEffect(() => {
    recompute();
  }, [recompute, layoutRevision]);

  useEffect(() => {
    const container = containerRef.current;
    const hero = heroRef.current;
    if (container === null) {
      return undefined;
    }

    const onResize = (): void => {
      recompute();
    };

    window.addEventListener('resize', onResize);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', onResize);
      };
    }

    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    if (hero !== null) {
      observer.observe(hero);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [containerRef, heroRef, recompute, layoutRevision]);

  return paths;
};
