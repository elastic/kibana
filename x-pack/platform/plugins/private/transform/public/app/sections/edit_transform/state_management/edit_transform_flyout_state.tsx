/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type FC, type PropsWithChildren } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useDispatch, Provider } from 'react-redux';
import { bindActionCreators } from 'redux';
import useMount from 'react-use/lib/useMount';

import type { TransformConfigUnion } from '../../../../../common/types/transform';

import { initialize, setApiError, setFormField, setFormSection } from './actions';
import { type FormFieldsState } from './form_field';
import { type FormSectionsState } from './form_section';
import { getDefaultState } from './get_default_state';

// The edit transform flyout uses a redux-toolkit to manage its form state with
// support for applying its state to a nested configuration object suitable for passing on
// directly to the API call. For now this is only used for the transform edit form.
// Once we apply the functionality to other places, e.g. the transform creation wizard,
// the generic framework code in this file should be moved to a dedicated location.

export interface ProviderProps {
  config: TransformConfigUnion;
  dataViewId?: string;
}

export interface State {
  apiErrorMessage?: string;
  formFields: FormFieldsState;
  formSections: FormSectionsState;
}

const editTransformFlyoutSlice = createSlice({
  name: 'editTransformFlyout',
  initialState: getDefaultState(),
  reducers: {
    initialize,
    setApiError,
    setFormField,
    setFormSection,
  },
});

const getReduxStore = () =>
  configureStore({
    reducer: editTransformFlyoutSlice.reducer,
  });

const EditTransformFlyoutContext = createContext<ProviderProps | null>(null);

export const EditTransformFlyoutProvider: FC<PropsWithChildren<ProviderProps>> = ({
  children,
  ...props
}) => {
  const store = useMemo(getReduxStore, []);

  // Apply original transform config to redux form state.
  useMount(() => {
    store.dispatch(editTransformFlyoutSlice.actions.initialize(props));
  });

  return (
    <EditTransformFlyoutContext.Provider value={props}>
      <Provider store={store}>{children}</Provider>
    </EditTransformFlyoutContext.Provider>
  );
};

export const useEditTransformFlyoutContext = () => {
  const c = useContext(EditTransformFlyoutContext);
  if (c === null) throw new Error('EditTransformFlyoutContext not set.');
  return c;
};

export const useEditTransformFlyoutActions = () => {
  const dispatch = useDispatch();
  return useMemo(() => bindActionCreators(editTransformFlyoutSlice.actions, dispatch), [dispatch]);
};
