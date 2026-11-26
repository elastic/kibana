/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { parseKiUri } from '../../../../../../common/ki_uri';
import { useKibana } from '../../../../hooks/use_kibana';
import { getKiUriHref, isDreamingWorkflowUri } from './view_ki_uri_helpers';

interface ViewKiSidebarUriValueProps {
  value: string;
  href?: string;
}

const ViewKiSidebarUriValue = ({ value, href }: ViewKiSidebarUriValueProps) => {
  if (href) {
    return (
      <EuiLink href={href} className="eui-textBreakWord">
        {value}
      </EuiLink>
    );
  }

  return <strong>{value}</strong>;
};

interface ViewKiSidebarUriLabelProps {
  uri: string;
}

export const ViewKiSidebarUriLabel = ({ uri }: ViewKiSidebarUriLabelProps) => {
  const {
    services: { application },
  } = useKibana();
  const { getUrlForApp } = application;

  const parsed = parseKiUri(uri);
  const href = useMemo(() => getKiUriHref(getUrlForApp, uri), [getUrlForApp, uri]);

  if (isDreamingWorkflowUri(uri)) {
    const dreamingWriterLabel = i18n.translate('xpack.contextEngine.viewKi.uriLabel.dreaming', {
      defaultMessage: 'Dreaming',
    });
    return <ViewKiSidebarUriValue value={dreamingWriterLabel} href={href} />;
  }
  if (!parsed) {
    return <ViewKiSidebarUriValue value={uri} href={href} />;
  }
  return (
    <FormattedMessage
      id="xpack.contextEngine.viewKi.uriLabel.schemeDetail"
      defaultMessage="{scheme} {identifier}"
      values={{
        scheme: <span>{parsed.scheme.toLowerCase()}</span>,
        identifier: <ViewKiSidebarUriValue value={parsed.identifier} href={href} />,
      }}
    />
  );
};
