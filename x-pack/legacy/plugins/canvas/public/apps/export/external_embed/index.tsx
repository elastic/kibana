/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
// @ts-ignore
import { getInFlight } from '../../../state/selectors/resolved_args';
// @ts-ignore
import { getRenderedWorkpad } from '../../../state/selectors/workpad';
import { Props, ExternalEmbed as Component } from './external_embed';
// @ts-ignore
import { LoadWorkpad } from '../export/load_workpad';

const mapStateToProps = (state: any) => ({
  isInFlight: getInFlight(state),
  workpad: getRenderedWorkpad(state),
});

const wait = () => <div>Please Wait...</div>;

const branches = [
  branch<Props>(({ workpad, isInFlight }) => workpad == null || isInFlight, renderComponent(wait)),
];

export const ExternalEmbed = compose<Props, Props>(
  connect(mapStateToProps),
  ...branches
)(Component);
