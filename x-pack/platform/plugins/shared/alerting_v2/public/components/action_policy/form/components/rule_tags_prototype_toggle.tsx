/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Design prototype control — switches Action Policy form preview states.
 */

import {
  EuiButtonGroup,
  type EuiButtonGroupOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ActionPolicyPrototypeView = 'empty' | 'with_tags' | 'notification_controls';

/** @deprecated Use ActionPolicyPrototypeView */
export type RuleTagsPrototypeView = ActionPolicyPrototypeView;

export const RULE_TAGS_PROTOTYPE_MOCK_TAGS = [
  'production',
  'staging',
  'security',
  'observability',
  'slo',
];

const PROTOTYPE_SETTINGS_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.prototypeSettingsTitle',
  {
    defaultMessage: 'Prototype settings',
  }
);

const PROTOTYPE_LEGEND = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.prototypeLegend',
  {
    defaultMessage: 'Action policy prototype view',
  }
);

const DRAG_HANDLE_ARIA = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.prototypeDragHandle',
  {
    defaultMessage: 'Drag to move prototype settings',
  }
);

interface ActionPolicyPrototypeToggleProps {
  selectedView: ActionPolicyPrototypeView;
  onChange: (view: ActionPolicyPrototypeView) => void;
}

interface Position {
  x: number;
  y: number;
}

export const ActionPolicyPrototypeToggle = ({
  selectedView,
  onChange,
}: ActionPolicyPrototypeToggleProps) => {
  const { euiTheme } = useEuiTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const options = useMemo(
    (): EuiButtonGroupOptionProps[] => [
      {
        id: 'empty',
        label: i18n.translate('xpack.alertingV2.actionPolicy.form.prototypeEmpty', {
          defaultMessage: 'Empty state',
        }),
        iconType: 'document',
        'data-test-subj': 'ruleTagsPrototypeToggle-empty',
      },
      {
        id: 'with_tags',
        label: i18n.translate('xpack.alertingV2.actionPolicy.form.prototypeWithTags', {
          defaultMessage: 'With tags',
        }),
        iconType: 'tag',
        'data-test-subj': 'ruleTagsPrototypeToggle-with_tags',
      },
      {
        id: 'notification_controls',
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.prototypeNotificationControls',
          {
            defaultMessage: 'Notification controls',
          }
        ),
        iconType: 'bell',
        'data-test-subj': 'ruleTagsPrototypeToggle-notification_controls',
      },
    ],
    []
  );

  const clampPosition = useCallback((next: Position): Position => {
    const el = panelRef.current;
    const width = el?.offsetWidth ?? 0;
    const height = el?.offsetHeight ?? 0;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
      x: Math.min(Math.max(0, next.x), maxX),
      y: Math.min(Math.max(0, next.y), maxY),
    };
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      setPosition(
        clampPosition({
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y,
        })
      );
    },
    [clampPosition]
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, onPointerMove, onPointerUp]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const el = panelRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
    event.preventDefault();
  };

  const floatingBarCss = css`
    position: fixed;
    z-index: ${euiTheme.levels.flyout};
    pointer-events: auto;
    ${position
      ? `
      top: ${position.y}px;
      left: ${position.x}px;
    `
      : `
      bottom: ${euiTheme.size.l};
      left: 50%;
      transform: translateX(-50%);
    `}
  `;

  const dragHandleCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${euiTheme.size.xs};
    cursor: ${isDragging ? 'grabbing' : 'grab'};
    user-select: none;
    touch-action: none;
    width: 100%;
  `;

  const trackCss = css`
    display: inline-flex;
    padding: ${euiTheme.size.xxs};
    background: ${euiTheme.colors.emptyShade};
    border-radius: ${euiTheme.size.l};
  `;

  return (
    <div ref={panelRef} css={floatingBarCss} data-test-subj="ruleTagsPrototypeSettings">
      <EuiPanel hasShadow paddingSize="s" color="subdued">
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={dragHandleCss}
              onPointerDown={startDrag}
              role="button"
              tabIndex={0}
              aria-label={DRAG_HANDLE_ARIA}
              data-test-subj="ruleTagsPrototypeSettingsDragHandle"
            >
              <EuiIcon type="dragVertical" size="s" color="subdued" />
              <EuiText size="xs">
                <strong>{PROTOTYPE_SETTINGS_TITLE}</strong>
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div css={trackCss} data-test-subj="ruleTagsPrototypeToggle">
              <EuiButtonGroup
                legend={PROTOTYPE_LEGEND}
                options={options}
                idSelected={selectedView}
                onChange={(id) => onChange(id as ActionPolicyPrototypeView)}
                type="single"
                buttonSize="compressed"
                color="text"
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};

/** @deprecated Use ActionPolicyPrototypeToggle */
export const RuleTagsPrototypeToggle = ActionPolicyPrototypeToggle;
