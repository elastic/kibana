/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListDensity } from './list_density';

const DENSITY_OPTIONS = [
  {
    id: 'compact' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.listDensity.compact', {
      defaultMessage: 'Compact',
    }),
    iconType: 'tableDensityCompact',
  },
  {
    id: 'normal' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.listDensity.normal', {
      defaultMessage: 'Normal',
    }),
    iconType: 'tableDensityNormal',
  },
  {
    id: 'expanded' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.listDensity.expanded', {
      defaultMessage: 'Expanded',
    }),
    iconType: 'tableDensityExpanded',
  },
];

interface Props {
  readonly density: ListDensity;
  readonly onChange: (next: ListDensity) => void;
}

/**
 * Page-level Display options control for inventory list density.
 * Applies to every table on the page (not per-grid).
 */
export const ListDisplayOptionsPopover = ({ density, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="controls"
          color="text"
          size="s"
          aria-label={i18n.translate(
            'xpack.streams.entityCentricLab.entities.displayOptions.ariaLabel',
            { defaultMessage: 'Display options' }
          )}
          title={i18n.translate(
            'xpack.streams.entityCentricLab.entities.displayOptions.ariaLabel',
            { defaultMessage: 'Display options' }
          )}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="entityCentricLabListDisplayOptionsButton"
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downRight"
      ownFocus
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('xpack.streams.entityCentricLab.entities.displayOptions.title', {
          defaultMessage: 'Display options',
        })}
      </EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFormLabel>
            {i18n.translate('xpack.streams.entityCentricLab.entities.listDensity.label', {
              defaultMessage: 'Density',
            })}
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.streams.entityCentricLab.entities.listDensity.legend',
              { defaultMessage: 'Table density' }
            )}
            options={DENSITY_OPTIONS}
            idSelected={density}
            onChange={(id) => onChange(id as ListDensity)}
            buttonSize="compressed"
            isIconOnly
            data-test-subj="entityCentricLabListDensityToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
