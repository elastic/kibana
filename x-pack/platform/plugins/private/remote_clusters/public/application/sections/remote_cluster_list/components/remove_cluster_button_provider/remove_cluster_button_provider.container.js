/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';

import { removeClusters } from '../../../../store/actions';

import { RemoveClusterButtonProvider as RemoveClusterButtonProviderComponent } from './remove_cluster_button_provider';

/** @type {import('react-redux').MapDispatchToProps<any, any>} */
const mapDispatchToProps = (dispatch) => {
  return {
    removeClusters: (names) => {
      dispatch(removeClusters(names));
    },
  };
};

/**
 * @type {import('react-redux').ConnectedComponent<typeof RemoveClusterButtonProviderComponent, {}>}
 */
export const RemoveClusterButtonProvider = connect(
  undefined,
  mapDispatchToProps
)(RemoveClusterButtonProviderComponent);
