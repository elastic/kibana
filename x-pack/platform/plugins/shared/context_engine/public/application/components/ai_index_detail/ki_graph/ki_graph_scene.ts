/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraph, KiGraphNode } from '../../../utils/ki_graph';

/** A node of the force layout, positioned in 3D. */
export interface LayoutNode {
  node: KiGraphNode;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** World-space radius of the bubble. */
  radius: number;
}

export interface Layout {
  nodes: LayoutNode[];
  byId: Map<string, LayoutNode>;
  links: Array<[LayoutNode, LayoutNode]>;
  alpha: number;
}

const ALPHA_MIN = 0.004;
const ALPHA_DECAY = 0.985;
const VELOCITY_DECAY = 0.55;
const REPULSION = 900;
const LINK_DISTANCE = 34;
const LINK_STRENGTH = 0.07;
const CENTER_STRENGTH = 0.012;

const RANDOM_MODULUS = 2147483647;

/** Park–Miller: deterministic, so the same graph always settles into the same shape. */
const seededRandom = (seed: number) => {
  let state = (Math.abs(Math.floor(seed)) % (RANDOM_MODULUS - 1)) + 1;
  return () => {
    state = (state * 16807) % RANDOM_MODULUS;
    return (state - 1) / (RANDOM_MODULUS - 1);
  };
};

export const nodeRadius = (node: KiGraphNode): number =>
  (node.kind === 'reference' ? 2.4 : 3.2) + 1.7 * Math.sqrt(node.degree);

/** Places nodes on a sphere, so the first frames already read as a map rather than a dot. */
export const createLayout = (graph: KiGraph): Layout => {
  const random = seededRandom(graph.nodes.length * 7919 + graph.links.length);
  const spread = 26 * Math.cbrt(graph.nodes.length + 1) + 20;
  const nodes = graph.nodes.map((node): LayoutNode => {
    const u = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const distance = spread * Math.cbrt(random());
    const ring = Math.sqrt(1 - u * u);
    return {
      node,
      x: distance * ring * Math.cos(angle),
      y: distance * u,
      z: distance * ring * Math.sin(angle),
      vx: 0,
      vy: 0,
      vz: 0,
      radius: nodeRadius(node),
    };
  });
  const byId = new Map(nodes.map((entry) => [entry.node.id, entry]));
  const links = graph.links.flatMap(({ source, target }): Array<[LayoutNode, LayoutNode]> => {
    const from = byId.get(source);
    const to = byId.get(target);
    return from && to ? [[from, to]] : [];
  });
  return { nodes, byId, links, alpha: 1 };
};

/** One step of a 3D force simulation: many-body repulsion, link springs and a pull to the centre. */
export const stepLayout = (layout: Layout): boolean => {
  const { nodes, links } = layout;
  if (layout.alpha < ALPHA_MIN) {
    return false;
  }
  const { alpha } = layout;

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz + 0.01;
      const force = (REPULSION * alpha) / distanceSquared;
      const distance = Math.sqrt(distanceSquared);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;
      a.vx -= fx;
      a.vy -= fy;
      a.vz -= fz;
      b.vx += fx;
      b.vy += fy;
      b.vz += fz;
    }
  }

  for (const [a, b] of links) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const rest = LINK_DISTANCE + a.radius + b.radius;
    const force = ((distance - rest) / distance) * LINK_STRENGTH * alpha;
    a.vx += dx * force;
    a.vy += dy * force;
    a.vz += dz * force;
    b.vx -= dx * force;
    b.vy -= dy * force;
    b.vz -= dz * force;
  }

  for (const entry of nodes) {
    entry.vx = (entry.vx - entry.x * CENTER_STRENGTH * alpha) * VELOCITY_DECAY;
    entry.vy = (entry.vy - entry.y * CENTER_STRENGTH * alpha) * VELOCITY_DECAY;
    entry.vz = (entry.vz - entry.z * CENTER_STRENGTH * alpha) * VELOCITY_DECAY;
    entry.x += entry.vx;
    entry.y += entry.vy;
    entry.z += entry.vz;
  }

  layout.alpha *= ALPHA_DECAY;
  return true;
};

export interface Camera {
  /** Point the camera orbits around. */
  tx: number;
  ty: number;
  tz: number;
  /** Yaw and pitch, in radians. */
  theta: number;
  phi: number;
  distance: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Distance from the camera along its view axis. */
  depth: number;
  scale: number;
}

/** Perspective projection of a world point onto the screen; `undefined` behind the camera. */
export const project = (
  camera: Camera,
  point: { x: number; y: number; z: number },
  viewport: { width: number; height: number; focal: number; centerX?: number }
): Projected | undefined => {
  const px = point.x - camera.tx;
  const py = point.y - camera.ty;
  const pz = point.z - camera.tz;
  const cosTheta = Math.cos(camera.theta);
  const sinTheta = Math.sin(camera.theta);
  const x1 = px * cosTheta - pz * sinTheta;
  const z1 = px * sinTheta + pz * cosTheta;
  const cosPhi = Math.cos(camera.phi);
  const sinPhi = Math.sin(camera.phi);
  const y2 = py * cosPhi - z1 * sinPhi;
  const z2 = py * sinPhi + z1 * cosPhi;
  const depth = z2 + camera.distance;
  if (depth < 1) {
    return undefined;
  }
  const scale = viewport.focal / depth;
  return {
    x: (viewport.centerX ?? viewport.width / 2) + x1 * scale,
    y: viewport.height / 2 + y2 * scale,
    depth,
    scale,
  };
};

export interface KiGraphSceneColors {
  background: string;
  text: string;
  accent: string;
  /** Colour per layer. */
  groups: Map<string, string>;
}

export interface KiGraphSceneCallbacks {
  onSelect: (id: string | undefined) => void;
  onHover: (id: string | undefined) => void;
}

type Rgb = [number, number, number];

const parseColor = (color: string): Rgb => {
  const hex = color.trim().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
  }
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [0, 1, 2].map((offset) => parseInt(hex[offset] + hex[offset], 16)) as Rgb;
  }
  const channels = color.match(/\d+(\.\d+)?/g);
  return channels && channels.length >= 3
    ? [Number(channels[0]), Number(channels[1]), Number(channels[2])]
    : [128, 128, 128];
};

const rgba = ([r, g, b]: Rgb, alpha: number): string =>
  `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ease = (current: number, target: number, rate: number) => current + (target - current) * rate;

const CLICK_TOLERANCE_PX = 4;
const AUTO_ROTATE_SPEED = 0.0016;
/** CSS pixels a selected node sits left of the visible area's centre, away from its flyout. */
const SELECTION_SHIFT_LEFT = 200;
const MAX_LABELS_OVERVIEW = 22;
const MAX_LABELS_FOCUS = 40;
const MAX_LABEL_CHARS = 42;

interface Drawn {
  entry: LayoutNode;
  projected: Projected;
  screenRadius: number;
}

/**
 * Draws a KI graph as translucent 3D bubbles on a canvas: a force layout that settles on screen,
 * slow auto-rotation, drag to orbit, scroll to zoom, and click to focus a node and its neighbours.
 */
export class KiGraphScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly callbacks: KiGraphSceneCallbacks;
  private readonly resizeObserver: ResizeObserver;
  private layout: Layout | undefined;
  private neighbors = new Map<string, Set<string>>();
  private colors: KiGraphSceneColors | undefined;
  private groupRgb = new Map<string, Rgb>();
  private textRgb: Rgb = [0, 0, 0];
  private accentRgb: Rgb = [0, 0, 0];
  private hidden = new Set<string>();
  private selected: string | undefined;
  private hovered: string | undefined;
  private spin = true;
  private zoom = 1;
  private camera: Camera = { tx: 0, ty: 0, tz: 0, theta: 0.6, phi: 0.35, distance: 400 };
  private extent = 100;
  private drawn: Drawn[] = [];
  private pointer: { x: number; y: number; startX: number; startY: number } | undefined;
  private dragged = false;
  private frame: number | undefined;
  private width = 0;
  private height = 0;
  /** Share of the canvas width covered on the left, such as by page content drawn over it. */
  private leftInsetRatio = 0;
  /** CSS pixels covered on the right while a node is selected, such as by its flyout. */
  private focusInset = 0;
  private centerX = 0;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement, callbacks: KiGraphSceneCallbacks) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('The graph needs a 2D canvas context.');
    }
    this.canvas = canvas;
    this.context = context;
    this.callbacks = callbacks;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.resize();
    this.frame = requestAnimationFrame(this.render);
  }

  setGraph(graph: KiGraph): void {
    this.layout = createLayout(graph);
    this.neighbors = graph.neighbors;
    if (this.selected && !this.layout.byId.has(this.selected)) {
      this.selected = undefined;
    }
  }

  setColors(colors: KiGraphSceneColors): void {
    this.colors = colors;
    this.groupRgb = new Map([...colors.groups].map(([group, color]) => [group, parseColor(color)]));
    this.textRgb = parseColor(colors.text);
    this.accentRgb = parseColor(colors.accent);
  }

  setHiddenGroups(hidden: Set<string>): void {
    this.hidden = hidden;
  }

  setSelected(id: string | undefined): void {
    this.selected = id;
  }

  setFocusInset(pixels: number): void {
    this.focusInset = pixels;
  }

  setLeftInsetRatio(ratio: number): void {
    this.leftInsetRatio = clamp(ratio, 0, 0.9);
  }

  setSpin(spin: boolean): void {
    this.spin = spin;
  }

  resetView(): void {
    this.zoom = 1;
    this.camera.phi = 0.35;
  }

  destroy(): void {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
    }
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.canvas;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.width = clientWidth * this.pixelRatio;
    this.height = clientHeight * this.pixelRatio;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private isVisible(entry: LayoutNode): boolean {
    return !this.hidden.has(entry.node.group);
  }

  /** The selection and its neighbours, or nothing when no node is selected. */
  private focusSet(): Set<string> | undefined {
    if (!this.selected) {
      return undefined;
    }
    return new Set([this.selected, ...(this.neighbors.get(this.selected) ?? [])]);
  }

  private render = (): void => {
    this.frame = requestAnimationFrame(this.render);
    const { layout, colors } = this;
    if (!layout || !colors || this.width === 0 || this.height === 0) {
      return;
    }

    // Large graphs settle over more frames rather than stalling one.
    const steps = layout.nodes.length > 400 ? 1 : layout.nodes.length > 150 ? 2 : 3;
    for (let step = 0; step < steps; step++) {
      if (!stepLayout(layout)) {
        break;
      }
    }

    this.updateCamera(layout);
    this.draw(layout, colors);
  };

  private updateCamera(layout: Layout): void {
    // Frame most of the map: a few far-flung, unlinked nodes should not shrink everything else.
    const distances = layout.nodes
      .filter((entry) => this.isVisible(entry))
      .map((entry) => Math.hypot(entry.x, entry.y, entry.z) + entry.radius)
      .sort((a, b) => a - b);
    const extent = Math.max(1, distances[Math.floor((distances.length - 1) * 0.9)] ?? 1);
    this.extent = ease(this.extent, extent, 0.08);

    const target = this.selected ? layout.byId.get(this.selected) : undefined;
    const focusDistance = target ? 110 + 16 * Math.sqrt(target.node.degree) : undefined;
    const overviewDistance = this.extent * 1.9 + 30;
    this.camera.tx = ease(this.camera.tx, target?.x ?? 0, 0.06);
    this.camera.ty = ease(this.camera.ty, target?.y ?? 0, 0.06);
    this.camera.tz = ease(this.camera.tz, target?.z ?? 0, 0.06);
    this.camera.distance = ease(
      this.camera.distance,
      (focusDistance ?? overviewDistance) * this.zoom,
      0.06
    );
    if (this.spin && !this.pointer) {
      this.camera.theta += AUTO_ROTATE_SPEED * (this.selected ? 0.4 : 1);
    }
    // Keep the selection in the part of the stage the flyout leaves visible.
    const right = this.selected ? this.focusInset * this.pixelRatio : 0;
    const left = this.leftInsetRatio * this.width;
    // Centre the map in whatever part of the canvas is left uncovered, keeping a third of it.
    const visible = Math.max(this.width / 3, this.width - left - right);
    const visibleLeft = Math.min(left, this.width - visible);
    const shift = this.selected ? SELECTION_SHIFT_LEFT * this.pixelRatio : 0;
    this.centerX = ease(this.centerX || this.width / 2, visibleLeft + visible / 2 - shift, 0.08);
  }

  private draw(layout: Layout, colors: KiGraphSceneColors): void {
    const { context, camera, pixelRatio } = this;
    const viewport = {
      width: this.width,
      height: this.height,
      // Sized to the part not covered on the left, so the map fits where it is centred.
      focal: Math.min(this.width * (1 - this.leftInsetRatio), this.height) * 0.9,
      centerX: this.centerX || this.width / 2,
    };
    // Transparent, so the graph can sit behind other content as a backdrop.
    context.clearRect(0, 0, this.width, this.height);

    const fogNear = camera.distance * 0.65;
    const fogFar = camera.distance + this.extent * 1.6;
    const fog = (depth: number) => clamp(1 - (depth - fogNear) / (fogFar - fogNear), 0.12, 1);
    const focus = this.focusSet();
    const projected = new Map<LayoutNode, Projected>();
    for (const entry of layout.nodes) {
      const point = this.isVisible(entry) ? project(camera, entry, viewport) : undefined;
      if (point) {
        projected.set(entry, point);
      }
    }

    context.lineCap = 'round';
    for (const [a, b] of layout.links) {
      const pa = projected.get(a);
      const pb = projected.get(b);
      if (!pa || !pb) {
        continue;
      }
      const inFocus =
        focus !== undefined &&
        (a.node.id === this.selected || b.node.id === this.selected) &&
        focus.has(a.node.id) &&
        focus.has(b.node.id);
      const hovered = this.hovered === a.node.id || this.hovered === b.node.id;
      const depthAlpha = Math.min(fog(pa.depth), fog(pb.depth));
      let alpha = 0.16 * depthAlpha;
      let width = 1;
      let rgb = this.textRgb;
      if (inFocus) {
        alpha = 0.85;
        width = 2;
        rgb = this.accentRgb;
      } else if (focus) {
        alpha = 0.03 * depthAlpha;
      } else if (hovered) {
        alpha = 0.6 * depthAlpha;
        width = 1.5;
        rgb = this.accentRgb;
      }
      context.strokeStyle = rgba(rgb, alpha);
      context.lineWidth = width * pixelRatio;
      context.beginPath();
      context.moveTo(pa.x, pa.y);
      context.lineTo(pb.x, pb.y);
      context.stroke();
    }

    // Far bubbles first, so near ones sit on top.
    const drawn: Drawn[] = [...projected]
      .map(([entry, point]) => ({
        entry,
        projected: point,
        screenRadius: Math.max(1.5 * pixelRatio, entry.radius * point.scale),
      }))
      .sort((a, b) => b.projected.depth - a.projected.depth);

    for (const { entry, projected: point, screenRadius } of drawn) {
      const { id, kind, group } = entry.node;
      const rgb = this.groupRgb.get(group) ?? this.textRgb;
      const emphasis = focus ? (focus.has(id) ? 1 : 0.1) : 1;
      const alpha = fog(point.depth) * emphasis * (kind === 'reference' ? 0.8 : 1);
      const gradient = context.createRadialGradient(
        point.x - screenRadius * 0.3,
        point.y - screenRadius * 0.35,
        screenRadius * 0.1,
        point.x,
        point.y,
        screenRadius
      );
      // A bubble: nearly clear in the middle, saturated at the rim.
      gradient.addColorStop(0, rgba(rgb, 0.07 * alpha));
      gradient.addColorStop(0.62, rgba(rgb, 0.2 * alpha));
      gradient.addColorStop(1, rgba(rgb, 0.78 * alpha));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, screenRadius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = rgba(rgb, 0.9 * alpha);
      context.lineWidth = (kind === 'reference' ? 0.75 : 1) * pixelRatio;
      context.stroke();

      if (id === this.selected || id === this.hovered) {
        context.strokeStyle = rgba(this.accentRgb, id === this.selected ? 0.95 : 0.6);
        context.lineWidth = 2 * pixelRatio;
        context.beginPath();
        context.arc(point.x, point.y, screenRadius + 4 * pixelRatio, 0, Math.PI * 2);
        context.stroke();
      }
    }
    this.drawn = drawn;
    this.drawLabels(drawn, focus, fog, colors);
  }

  private drawLabels(
    drawn: Drawn[],
    focus: Set<string> | undefined,
    fog: (depth: number) => number,
    colors: KiGraphSceneColors
  ): void {
    const { context, pixelRatio } = this;
    const priority = (entry: LayoutNode) =>
      entry.node.id === this.selected
        ? 1e6
        : entry.node.id === this.hovered
        ? 1e5
        : entry.node.degree + (entry.node.kind === 'ki' ? 0.5 : 0);
    const candidates = drawn
      .filter(({ entry }) =>
        focus
          ? focus.has(entry.node.id)
          : entry.node.kind === 'ki' || entry.node.id === this.hovered
      )
      .sort((a, b) => priority(b.entry) - priority(a.entry))
      .slice(0, focus ? MAX_LABELS_FOCUS : MAX_LABELS_OVERVIEW);

    const placed: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    const fontSize = 12 * pixelRatio;
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.lineJoin = 'round';
    for (const { entry, projected: point, screenRadius } of candidates) {
      const strong = entry.node.id === this.selected || entry.node.id === this.hovered;
      const text =
        entry.node.label.length > MAX_LABEL_CHARS && !strong
          ? `${entry.node.label.slice(0, MAX_LABEL_CHARS - 1)}…`
          : entry.node.label;
      context.font = `${strong ? 600 : 400} ${fontSize}px Inter, -apple-system, sans-serif`;
      const width = context.measureText(text).width;
      const x = point.x;
      const y = point.y - screenRadius - 4 * pixelRatio;
      const box = { x0: x - width / 2, y0: y - fontSize, x1: x + width / 2, y1: y };
      const overlaps = placed.some(
        (other) => box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0
      );
      if (overlaps && !strong) {
        continue;
      }
      placed.push(box);
      const alpha = strong ? 1 : fog(point.depth);
      context.strokeStyle = colors.background;
      context.lineWidth = 3 * pixelRatio;
      context.globalAlpha = alpha;
      context.strokeText(text, x, y);
      context.fillStyle = rgba(this.textRgb, strong ? 1 : 0.85);
      context.fillText(text, x, y);
      context.globalAlpha = 1;
    }
  }

  /** The front-most visible node under a canvas point. */
  private pick(clientX: number, clientY: number): string | undefined {
    const bounds = this.canvas.getBoundingClientRect();
    const x = (clientX - bounds.left) * this.pixelRatio;
    const y = (clientY - bounds.top) * this.pixelRatio;
    const slack = 4 * this.pixelRatio;
    let best: Drawn | undefined;
    for (const candidate of this.drawn) {
      const { projected: point, screenRadius } = candidate;
      if (Math.hypot(point.x - x, point.y - y) <= screenRadius + slack) {
        if (!best || point.depth < best.projected.depth) {
          best = candidate;
        }
      }
    }
    return best?.entry.node.id;
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointer = {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    };
    this.dragged = false;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.pointer) {
      const hovered = this.pick(event.clientX, event.clientY);
      if (hovered !== this.hovered) {
        this.hovered = hovered;
        this.canvas.style.cursor = hovered ? 'pointer' : 'grab';
        this.callbacks.onHover(hovered);
      }
      return;
    }
    const dx = event.clientX - this.pointer.x;
    const dy = event.clientY - this.pointer.y;
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    if (
      Math.hypot(event.clientX - this.pointer.startX, event.clientY - this.pointer.startY) >
      CLICK_TOLERANCE_PX
    ) {
      this.dragged = true;
      this.canvas.style.cursor = 'grabbing';
    }
    this.camera.theta += dx * 0.006;
    this.camera.phi = clamp(this.camera.phi + dy * 0.006, -1.3, 1.3);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.pointer && !this.dragged) {
      this.callbacks.onSelect(this.pick(event.clientX, event.clientY));
    }
    this.pointer = undefined;
    this.canvas.style.cursor = this.hovered ? 'pointer' : 'grab';
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private onPointerLeave = (): void => {
    if (!this.pointer && this.hovered) {
      this.hovered = undefined;
      this.callbacks.onHover(undefined);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoom = clamp(this.zoom * Math.exp(event.deltaY * 0.0012), 0.2, 4);
  };
}
