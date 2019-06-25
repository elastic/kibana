/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiComboBox,
  EuiFieldSearch,
  ICON_TYPES,
  palettes,
  EuiIcon,
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { DatasourceDataPanelProps } from '../types';
import { IndexPatternPrivateState } from './indexpattern';
import { ChildDragDropProvider, DragDrop } from '../drag_drop';

export function IndexPatternDataPanel(props: DatasourceDataPanelProps<IndexPatternPrivateState>) {
  const [fieldsFilter, setFieldsFilter] = useState('');
  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      Index Pattern Data Source
      <div>
        <EuiComboBox
          data-test-subj="indexPattern-switcher"
          options={Object.values(props.state.indexPatterns).map(({ title, id }) => ({
            label: title,
            value: id,
          }))}
          selectedOptions={
            props.state.currentIndexPatternId
              ? [
                  {
                    label: props.state.indexPatterns[props.state.currentIndexPatternId].title,
                    value: props.state.indexPatterns[props.state.currentIndexPatternId].id,
                  },
                ]
              : undefined
          }
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          onChange={choices => {
            props.setState({
              ...props.state,
              currentIndexPatternId: choices[0].value as string,
            });
          }}
        />
        <div className="lnsFieldListPanel">
          <div className="lnsFieldListPanel__searchWrapper">
            <EuiFieldSearch
              placeholder={i18n.translate('xpack.viz_editor.indexPatterns.filterByNameLabel', {
                defaultMessage: 'Search fields',
                description: 'Search the list of fields in the index pattern for the provided text',
              })}
              value={fieldsFilter}
              onChange={e => {
                setFieldsFilter(e.target.value);
              }}
              aria-label="Search fields"
            />
          </div>
          <div className="lnsFieldListPanel__list">
            <div className="lnsFieldListPanel__listOverflow">
              {props.state.currentIndexPatternId &&
                props.state.indexPatterns[props.state.currentIndexPatternId].fields.map(field => (
                  <DragDrop
                    key={field.name}
                    value={field}
                    draggable
                    className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${
                      field.type
                    }`}
                  >
                    {fieldIcon(field)}
                    <span className="lnsFieldListPanel__fieldName" title={field.name}>
                      <EuiHighlight search={fieldsFilter.toLowerCase()}>{field.name}</EuiHighlight>
                    </span>
                  </DragDrop>
                ))}
            </div>
          </div>
        </div>
      </div>
    </ChildDragDropProvider>
  );
}

function stringToNum(s: string) {
  // tslint:disable-next-line:no-bitwise
  return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 1);
}

function fieldIcon({ type }: { type: string }): any {
  const icons: any = {
    geo_point: 'globe',
    boolean: 'invert',
    date: 'calendar',
  };

  const iconType = icons[type] || ICON_TYPES.find(t => t === type) || 'empty';
  const { colors } = palettes.euiPaletteColorBlind;
  const colorIndex = stringToNum(iconType) % colors.length;

  const classes = classNames(
    'lnsFieldListPanel__fieldIcon',
    `lnsFieldListPanel__fieldIcon--${type}`
  );

  return <EuiIcon type={iconType} color={colors[colorIndex]} className={classes} />;
}
