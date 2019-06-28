/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { register, addRegistries } from '@kbn/interpreter/common';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { registries } from 'plugins/interpreter/registries';
import { getInterpreter } from 'plugins/interpreter/interpreter';
import { getAppReady, getBasePath } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { elementsRegistry } from '../../lib/elements_registry';
import { templatesRegistry } from '../../lib/templates_registry';
import { tagsRegistry } from '../../lib/tags_registry';
import { elementSpecs } from '../../../canvas_plugin_src/elements';
import { transformSpecs } from '../../../canvas_plugin_src/uis/transforms';
import { modelSpecs } from '../../../canvas_plugin_src/uis/models';
import { viewSpecs } from '../../../canvas_plugin_src/uis/views';
import { datasourceSpecs } from '../../../canvas_plugin_src/uis/datasources';
import { args as argSpecs } from '../../../canvas_plugin_src/uis/arguments';
import { tagSpecs } from '../../../canvas_plugin_src/uis/tags';
import { templateSpecs } from '../../../canvas_plugin_src/templates';
import { clientFunctions } from '../../functions';

import {
  argTypeRegistry,
  datasourceRegistry,
  modelRegistry,
  transformRegistry,
  viewRegistry,
} from '../../expression_types';
import { App as Component } from './app';
import { trackRouteChange } from './track_route_change';

const mapStateToProps = state => {
  // appReady could be an error object
  const appState = getAppReady(state);

  return {
    appState: typeof appState === 'object' ? appState : { ready: appState },
    basePath: getBasePath(state),
  };
};

addRegistries(registries, {
  elements: elementsRegistry,
  transformUIs: transformRegistry,
  datasourceUIs: datasourceRegistry,
  modelUIs: modelRegistry,
  viewUIs: viewRegistry,
  argumentUIs: argTypeRegistry,
  templates: templatesRegistry,
  tagUIs: tagsRegistry,
});

register(registries, {
  elements: elementSpecs,
  transformUIs: transformSpecs,
  modelUIs: modelSpecs,
  viewUIs: viewSpecs,
  datasourceUIs: datasourceSpecs,
  argumentUIs: argSpecs,
  browserFunctions: clientFunctions,
  templates: templateSpecs,
  tagUIs: tagSpecs,
});

const mapDispatchToProps = dispatch => ({
  setAppReady: () => async () => {
    try {
      await getInterpreter();

      // set app state to ready
      dispatch(appReady());
    } catch (e) {
      dispatch(appError(e));
    }
  },
  setAppError: payload => dispatch(appError(payload)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    setAppReady: dispatchProps.setAppReady(stateProps.basePath),
  };
};

export const App = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withProps(() => ({
    onRouteChange: trackRouteChange,
  }))
)(Component);
