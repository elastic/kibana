/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DocLinksStart } from '@kbn/core/public';
import React from 'react';

import { ConfirmForceInstallModal } from './confirm_force_install_modal';

export default {
  title: 'Unverified Package Confirm Modal',
  description: 'A modal allowing the user to choose to force install an unverified package',
};

interface Args {
  packageName: string;
  packageVersion: string;
}

const defaults = {
  packageName: 'pkg',
  packageVersion: '1.0.0',
};

const args: Args = {
  ...defaults,
};

const argTypes = {
  packageName: {
    control: {
      title: 'Package Name',
      type: 'text',
      default: defaults.packageName,
    },
  },
  packageVersion: {
    control: {
      title: 'Package Version',
      type: 'text',
      default: defaults.packageVersion,
    },
  },
};

export const UnverifiedIntegrationModal = ({ packageName, packageVersion }: Args) => {
  const mockDocLinks: DocLinksStart = {
    links: {
      // @ts-ignore only defining what we need
      fleet: {
        packageSignatures: 'elastic.co',
      },
    },
  };

  return (
    <ConfirmForceInstallModal
      onCancel={() => {}}
      onConfirm={() => {}}
      pkg={{ name: packageName, version: packageVersion }}
      docLinks={mockDocLinks}
    />
  );
};
UnverifiedIntegrationModal.args = args;
UnverifiedIntegrationModal.argTypes = argTypes;
