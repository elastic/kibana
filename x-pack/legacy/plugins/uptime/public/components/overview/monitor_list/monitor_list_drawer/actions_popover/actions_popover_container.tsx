/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AppState } from '../../../../../state';
import { isIntegrationsPopupOpen } from '../../../../../state/selectors';
import { PopoverState, toggleIntegrationsPopover } from '../../../../../state/actions';
import { ActionsPopoverComponent } from '../index';

const mapStateToProps = (state: AppState) => ({
  popoverState: isIntegrationsPopupOpen(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  togglePopoverIsVisible: (popoverState: PopoverState) => {
    return dispatch(toggleIntegrationsPopover(popoverState));
  },
});

export const ActionsPopover = connect(mapStateToProps, mapDispatchToProps)(ActionsPopoverComponent);
