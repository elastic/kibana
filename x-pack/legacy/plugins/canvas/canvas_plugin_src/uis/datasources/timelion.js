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
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getSimpleArg, setSimpleArg } from '../../../public/lib/arg_helpers';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings } from '../../strings';
import { TIMELION, CANVAS } from '../../../i18n';

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
      <EuiText size="xs">
        <h3>{TIMELION}</h3>
        <p>{strings.getAbout()}</p>
      </EuiText>

      <EuiSpacer />

      <EuiFormRow label={strings.getQueryLabel()} helpText={strings.getQueryHelp()}>
        <EuiTextArea
          className="canvasTextArea__code"
          value={getQuery()}
          onChange={e => setArg(argName, e.target.value)}
        />
      </EuiFormRow>
      {
        // TODO: Time timelion interval picker should be a drop down
      }
      <EuiFormRow
        label={strings.getIntervalLabel()}
        helpText={strings.getIntervalHelp()}
        compressed
      >
        <EuiFieldText value={getInterval()} onChange={e => setArg('interval', e.target.value)} />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiCallOut color="warning" title={strings.getTipsHeading()} size="s">
        <ul>
          <li>
            <FormattedMessage
              id="xpack.canvas.uis.dataSources.timelion.tips.time"
              defaultMessage="{timelion} requires a time range, you should add a time filter element to your page somewhere, or use the code editor to pass in a time filter."
              values={{
                timelion: TIMELION,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.canvas.uis.dataSources.timelion.tips.functions"
              defaultMessage="Some {timelion} functions, such as {functionExample}, don't translate to a {canvas} data table. Anything todo with data manipulation should work grand."
              values={{
                timelion: TIMELION,
                canvas: CANVAS,
                functionExample: <EuiCode>.color()</EuiCode>,
              }}
            />
          </li>
        </ul>
      </EuiCallOut>
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
