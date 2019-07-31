/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect, MapDispatchToProps } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
// @ts-ignore
import { getInFlight } from '../../../state/selectors/resolved_args';
// @ts-ignore
import { initializeWorkpad } from '../../../state/actions/workpad';
// @ts-ignore
import { getRenderedWorkpad } from '../../../state/selectors/workpad';
import { Props, ExternalEmbed as Component } from './external_embed';
// @ts-ignore
import { LoadWorkpad } from '../export/load_workpad';

const mapStateToProps = (state: any) => ({
  inFlight: getInFlight(state),
  workpad: getRenderedWorkpad(state),
});

const mapDispatchToProps: MapDispatchToProps<{}, {}> = dispatch => ({
  initializeWorkpad() {
    dispatch(initializeWorkpad());
  },
});

const branches = [branch<Props>(({ workpad }) => workpad == null, renderComponent(LoadWorkpad))];

export const RefreshControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
export const ExternalEmbed = compose<Props, Props>(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  ...branches
)(Component);
