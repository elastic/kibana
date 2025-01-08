/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { Component, Suspense } from 'react';

import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

interface Props {
  notifications: NotificationsStart;
}

interface State {
  error: Error | null;
}

export class SuspenseErrorBoundary extends Component<PropsWithChildren<Props>, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    // Update state so next render shows fallback UI.
    return { error };
  }

  public componentDidCatch(error: Error) {
    const { notifications } = this.props;
    if (notifications) {
      const title = i18n.translate('xpack.security.uiApi.errorBoundaryToastTitle', {
        defaultMessage: 'Failed to load Kibana asset',
      });
      const toastMessage = i18n.translate('xpack.security.uiApi.errorBoundaryToastMessage', {
        defaultMessage: 'Reload page to continue.',
      });
      notifications.toasts.addError(error, { title, toastMessage });
    }
  }

  render() {
    const { children, notifications } = this.props;
    const { error } = this.state;
    if (!notifications || error) {
      return null;
    }
    return <Suspense fallback={<EuiLoadingSpinner />}>{children}</Suspense>;
  }
}
