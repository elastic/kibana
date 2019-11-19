/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiButtonIcon, EuiText } from '@elastic/eui';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { ColorPickerPopover } from '../../../components/color_picker_popover';
import { TooltipIcon, IconType } from '../../../components/tooltip_icon';
import { ExpressionAST, CanvasWorkpad } from '../../../../types';
import { ArgTypesStrings } from '../../../../i18n';

const { set, del } = immutable;
const { SeriesStyle: strings } = ArgTypesStrings;

interface Arguments {
  color: string;
}
type Argument = keyof Arguments;

interface Props {
  argValue: ExpressionAST;
  labels?: string[];
  onValueChange: (argValue: ExpressionAST) => void;
  typeInstance: {
    name: string;
  };
  workpad: CanvasWorkpad;
}

export const SimpleTemplate: FunctionComponent<Props> = props => {
  const { typeInstance, argValue, onValueChange, labels, workpad } = props;
  const { name } = typeInstance;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const color: string = get(chainArgs, 'color.0', '');

  const handleChange: <T extends Argument>(key: T, val: string) => void = (argName, val) => {
    const fn = val === '' ? del : set;
    const newValue = fn(argValue, `chain.0.arguments.${argName}`, [val]);
    return onValueChange(newValue);
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" className="canvasArgSeries__colorPicker">
      {!color || color.length === 0 ? (
        <Fragment>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{strings.getColorLabel()}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <EuiLink
                aria-label={`${strings.getColorLabel()}: ${strings.getColorValueDefault()}`}
                onClick={() => handleChange('color', '#000000')}
              >
                {strings.getColorValueDefault()}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        </Fragment>
      ) : (
        <Fragment>
          <EuiFlexItem grow={false}>
            <label htmlFor="series-style">
              <EuiText size="xs">{strings.getColorLabel()}</EuiText>
            </label>
          </EuiFlexItem>
          <EuiFlexItem style={{ fontSize: 0 }}>
            <ColorPickerPopover
              anchorPosition="leftCenter"
              colors={workpad.colors}
              onChange={val => handleChange('color', val)}
              value={color}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              onClick={() => handleChange('color', '')}
              aria-label={strings.getRemoveAriaLabel()}
            />
          </EuiFlexItem>
        </Fragment>
      )}
      {name !== 'defaultStyle' && (!labels || labels.length === 0) && (
        <EuiFlexItem grow={false}>
          <TooltipIcon
            position="left"
            icon={IconType.warning}
            content={strings.getNoSeriesTooltip()}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

SimpleTemplate.displayName = 'SeriesStyleArgSimpleInput';

SimpleTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  labels: PropTypes.array,
  onValueChange: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};
