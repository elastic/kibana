/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiToolTip,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DEFAULT_ICON, ICON_SOURCE } from '../../../../../../common/constants';
import { OTHER_CATEGORY_LABEL } from '../../style_util';
import { IconSelect } from './icon_select';
import { StopInput } from '../stop_input';
import { getMakiSymbol, PREFERRED_ICONS, SYMBOL_OPTIONS } from '../../symbol_utils';
import type { IconStop, CustomIcon } from '../../../../../../common/descriptor_types';
import type { IField } from '../../../../fields/field';
import { mapColorStopsStyles } from '../map_color_stops.styles';

function isDuplicateStop(targetStop: string | null, iconStops: IconStop[]) {
  const stops = iconStops.filter(({ stop }) => {
    return targetStop === stop;
  });
  return stops.length > 1;
}

export function getFirstUnusedSymbol(iconStops: IconStop[]) {
  const firstUnusedPreferredIconId = PREFERRED_ICONS.find((iconId) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === iconId;
    });
    return !isSymbolBeingUsed;
  });

  if (firstUnusedPreferredIconId) {
    return firstUnusedPreferredIconId;
  }

  const firstUnusedSymbol = SYMBOL_OPTIONS.find(({ value }) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === value;
    });
    return !isSymbolBeingUsed;
  });

  return firstUnusedSymbol ? firstUnusedSymbol.value : DEFAULT_ICON;
}

interface Props {
  field: IField;
  getValueSuggestions: (query: string) => Promise<string[]>;
  iconStops: IconStop[];
  onChange: (params: { customStops: IconStop[]; isInvalid?: boolean }) => void;
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
  customIcons: CustomIcon[];
}

export function IconStops({
  field,
  getValueSuggestions,
  iconStops,
  onChange,
  onCustomIconsChange,
  customIcons,
}: Props) {
  const styles = useMemoCss(mapColorStopsStyles);
  return iconStops
    .map(({ stop, icon, iconSource }, index): ReactElement | undefined => {
      const iconInfo =
        iconSource === ICON_SOURCE.CUSTOM
          ? customIcons.find(({ symbolId }) => symbolId === icon)
          : getMakiSymbol(icon);
      if (iconInfo === undefined) return;
      const { svg, label } = iconInfo;
      const onIconSelect = ({ selectedIconId }: { selectedIconId: string }) => {
        const newIconStops = [...iconStops];
        newIconStops[index] = {
          ...iconStops[index],
          icon: selectedIconId,
        };
        onChange({ customStops: newIconStops });
      };
      const onStopChange = (newStopValue: string) => {
        const newIconStops = [...iconStops];
        newIconStops[index] = {
          ...iconStops[index],
          stop: newStopValue,
        };
        onChange({
          customStops: newIconStops,
          isInvalid: isDuplicateStop(newStopValue, iconStops),
        });
      };
      const onAdd = () => {
        onChange({
          customStops: [
            ...iconStops.slice(0, index + 1),
            {
              stop: '',
              icon: getFirstUnusedSymbol(iconStops),
            },
            ...iconStops.slice(index + 1),
          ],
        });
      };
      const onRemove = () => {
        onChange({
          customStops: [...iconStops.slice(0, index), ...iconStops.slice(index + 1)],
        });
      };

      let deleteButton;
      if (iconStops.length > 2 && index !== 0) {
        const deleteLabel = i18n.translate('xpack.maps.styles.iconStops.deleteButtonLabel', {
          defaultMessage: 'Delete',
        });
        deleteButton = (
          <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={deleteLabel}
              onClick={onRemove}
            />
          </EuiToolTip>
        );
      }

      const addLabel = i18n.translate('xpack.maps.styles.iconStops.addButtonAriaLabel', {
        defaultMessage: 'Add row',
      });
      const iconStopButtons = (
        <div>
          {deleteButton}
          <EuiToolTip content={addLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="plusCircle"
              color="primary"
              aria-label={addLabel}
              onClick={onAdd}
            />
          </EuiToolTip>
        </div>
      );

      const errors: string[] = [];
      // TODO check for duplicate values and add error messages here

      const stopInput =
        index === 0 ? (
          <EuiFieldText
            aria-label={OTHER_CATEGORY_LABEL}
            placeholder={OTHER_CATEGORY_LABEL}
            disabled
            compressed
          />
        ) : (
          <StopInput
            key={field.getName()} // force new component instance when field changes
            field={field}
            getValueSuggestions={getValueSuggestions}
            value={stop ?? ''}
            onChange={onStopChange}
          />
        );

      return (
        <EuiFormRow
          key={index}
          css={styles.mapColorStops}
          isInvalid={errors.length !== 0}
          error={errors}
          display="rowCompressed"
        >
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
              {stopInput}
            </EuiFlexItem>
            <EuiFlexItem>
              <IconSelect
                onCustomIconsChange={onCustomIconsChange}
                customIcons={customIcons}
                onChange={onIconSelect}
                icon={{ value: icon, svg, label }}
                append={iconStopButtons}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      );
    })
    .filter((stop): stop is ReactElement => {
      return stop !== undefined;
    });
}
