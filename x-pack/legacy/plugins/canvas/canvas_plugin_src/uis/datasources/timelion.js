/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiFieldText,
  EuiCallOut,
  EuiSpacer,
  EuiCode,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getSimpleArg, setSimpleArg } from '../../../public/lib/arg_helpers';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings, TIMELION, CANVAS } from '../../../i18n';
import { TooltipIcon } from '../../../public/components/tooltip_icon';

const { Timelion: strings } = DataSourceStrings;

const TimelionDatasource = ({ args, updateArgs, defaultIndex }) => {
  const DEFAULT_QUERY = `.es(index=${defaultIndex})`;

  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  const getArgName = () => {
    if (getSimpleArg('_', args)[0]) {
      return '_';
    }
    if (getSimpleArg('q', args)[0]) {
      return 'q';
    }
    return 'query';
  };

  const argName = getArgName();

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getQuery = () => {
    return getSimpleArg(argName, args)[0] || DEFAULT_QUERY;
  };

  const getInterval = () => {
    return getSimpleArg('interval', args)[0] || 'auto';
  };

  return (
    <div>
      <EuiCallOut title={strings.getTipsHeading()} size="s" iconType="iInCircle">
        <ul>
          <li>
            <FormattedMessage
              id="xpack.canvas.uis.dataSources.timelion.tips.time"
              defaultMessage="{timelion} requires a time range. Add a time filter element to your page or use the expression editor to pass one in."
              values={{
                timelion: TIMELION,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.canvas.uis.dataSources.timelion.tips.functions"
              defaultMessage="Some {timelion} functions, such as {functionExample}, do not translate to a {canvas} data table. However, anything todo with data manipulation should work as expected."
              values={{
                timelion: TIMELION,
                canvas: CANVAS,
                functionExample: <EuiCode>.color()</EuiCode>,
              }}
            />
          </li>
        </ul>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={strings.getQueryLabel()}
        helpText={strings.getQueryHelp()}
        labelAppend={<TooltipIcon content={strings.getAbout()} />}
      >
        <EuiTextArea
          className="canvasTextArea__code"
          value={getQuery()}
          onChange={e => setArg(argName, e.target.value)}
          rows={15}
        />
      </EuiFormRow>
      {
        // TODO: Time timelion interval picker should be a drop down
      }
      <EuiFormRow
        label={strings.getIntervalLabel()}
        helpText={strings.getIntervalHelp()}
        display="columnCompressed"
      >
        <EuiFieldText
          compressed
          value={getInterval()}
          onChange={e => setArg('interval', e.target.value)}
        />
      </EuiFormRow>
    </div>
  );
};

TimelionDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  defaultIndex: PropTypes.string,
};

export const timelion = () => ({
  name: 'timelion',
  displayName: TIMELION,
  help: strings.getHelp(),
  image: 'timelionApp',
  template: templateFromReactComponent(TimelionDatasource),
});
