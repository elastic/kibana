/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSplitButton,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunMode } from '../../common/types';

const RUN_LABEL = i18n.translate('xpack.notebook.runButton.run', { defaultMessage: 'Run' });

const MODES: Record<RunMode, { icon: string; title: string; description: string }> = {
  auto: {
    icon: 'bolt',
    title: i18n.translate('xpack.notebook.runButton.auto', { defaultMessage: 'Auto' }),
    description: i18n.translate('xpack.notebook.runButton.autoDescription', {
      defaultMessage: 'Re-run automatically when upstream cells change',
    }),
  },
  manual: {
    icon: 'play',
    title: i18n.translate('xpack.notebook.runButton.manual', { defaultMessage: 'Manual' }),
    description: i18n.translate('xpack.notebook.runButton.manualDescription', {
      defaultMessage: 'Run only when you click Run; marked stale when upstream cells change',
    }),
  },
};

const RUN_MODE_ORDER: readonly RunMode[] = ['auto', 'manual'];

export const RunButton = ({
  runMode,
  onRun,
  onRunModeChange,
}: {
  runMode: RunMode;
  onRun: () => void;
  onRunModeChange: (runMode: RunMode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { icon, title, description } = MODES[runMode];

  return (
    <EuiSplitButton size="s" color={runMode === 'auto' ? 'primary' : 'text'}>
      <EuiSplitButton.ActionPrimary
        iconType={icon}
        onClick={onRun}
        tooltipProps={{ title, content: description }}
        data-test-subj="notebookCellRun"
      >
        {RUN_LABEL}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="chevronSingleDown"
        aria-label={i18n.translate('xpack.notebook.runButton.modeAriaLabel', {
          defaultMessage: 'Run mode',
        })}
        onClick={() => setIsOpen((open) => !open)}
        data-test-subj="notebookCellRunMode"
        popoverProps={{
          isOpen,
          closePopover: () => setIsOpen(false),
          panelPaddingSize: 'none',
          anchorPosition: 'downRight',
          'aria-label': i18n.translate('xpack.notebook.runButton.modePopoverAriaLabel', {
            defaultMessage: 'Choose run mode',
          }),
          children: (
            <EuiContextMenuPanel
              css={{ maxWidth: 320 }}
              items={RUN_MODE_ORDER.map((mode) => (
                <EuiContextMenuItem
                  key={mode}
                  icon={MODES[mode].icon}
                  aria-current={mode === runMode}
                  onClick={() => {
                    setIsOpen(false);
                    onRunModeChange(mode);
                  }}
                  data-test-subj={`notebookCellRunMode-${mode}`}
                >
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <strong>{MODES[mode].title}</strong>
                    </EuiFlexItem>
                    {mode === runMode && (
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="check" size="s" aria-hidden={true} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  <EuiText size="xs" color="subdued">
                    {MODES[mode].description}
                  </EuiText>
                </EuiContextMenuItem>
              ))}
            />
          ),
        }}
      />
    </EuiSplitButton>
  );
};
