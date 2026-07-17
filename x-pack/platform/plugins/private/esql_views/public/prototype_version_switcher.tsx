/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePrototypeVersion } from './services/use_prototype_version';
import type { PrototypeVersion } from './services/prototype_version_store';

const OPTIONS: Array<{ id: PrototypeVersion; label: string }> = [
  { id: 'v1', label: 'V1' },
  { id: 'v2', label: 'V2' },
  { id: 'v3', label: 'V3' },
];

/**
 * Appended next to the page's breadcrumbs (see `mount_management_section.tsx`) so
 * reviewers can flip between alternate UX takes on this prototype. Prototyping-only,
 * not meant to ship.
 */
export const PrototypeVersionSwitcher: React.FunctionComponent = () => {
  const [version, setVersion] = usePrototypeVersion();

  return (
    <EuiButtonGroup
      css={css`
        padding-left: 12px;
      `}
      legend={i18n.translate('esqlViews.prototypeVersionSwitcher.legend', {
        defaultMessage: 'Prototype version',
      })}
      options={OPTIONS}
      idSelected={version}
      onChange={(id) => setVersion(id as PrototypeVersion)}
      buttonSize="compressed"
      data-test-subj="esqlViewsPrototypeVersionSwitcher"
    />
  );
};
