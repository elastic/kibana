/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useObservable } from '../../../../../../../src/plugins/kibana_react/public';
import { ILicense } from '../../../../../../plugins/licensing/public';
import { useApmPluginContext } from '../../hooks/useApmPluginContext';
import { InvalidLicenseNotification } from './InvalidLicenseNotification';

export const LicenseContext = React.createContext<ILicense | undefined>(
  undefined
);

export function LicenseProvider({ children }: { children: React.ReactChild }) {
  const { license$ } = useApmPluginContext().plugins.licensing;
  const license = useObservable(license$);
  const hasInvalidLicense = !license?.isActive;

  // if license is invalid show an error message
  if (hasInvalidLicense) {
    return <InvalidLicenseNotification />;
  }

  // render rest of application and pass down license via context
  return <LicenseContext.Provider value={license} children={children} />;
}
