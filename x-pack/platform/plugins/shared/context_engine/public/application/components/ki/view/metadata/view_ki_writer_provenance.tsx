/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import type { KiGovernanceWriter } from './view_ki_document_helpers';
import {
  getKiWriterAgentManageHref,
  getKiWriterUriHref,
  getWriterAgentId,
  parseWriterUri,
} from './view_ki_writer_helpers';

interface ViewKiSidebarWriterValueProps {
  value: string;
  href?: string;
}

const ViewKiSidebarWriterValue = ({ value, href }: ViewKiSidebarWriterValueProps) => {
  if (href) {
    return (
      <EuiLink href={href} className="eui-textBreakWord">
        {value}
      </EuiLink>
    );
  }

  return <EuiCode transparentBackground>{value}</EuiCode>;
};

interface ViewKiSidebarWriterProvenanceProps {
  writer: KiGovernanceWriter;
}

export const ViewKiSidebarWriterProvenance = ({ writer }: ViewKiSidebarWriterProvenanceProps) => {
  const {
    services: { application },
  } = useKibana();
  const { getUrlForApp } = application;

  const parsed = parseWriterUri(writer.uri);
  const agentId = getWriterAgentId(writer.metadata);
  const agentHref = useMemo(
    () => (agentId ? getKiWriterAgentManageHref(getUrlForApp, agentId) : undefined),
    [agentId, getUrlForApp]
  );
  const writerHref = useMemo(
    () => getKiWriterUriHref(getUrlForApp, writer.uri),
    [getUrlForApp, writer.uri]
  );

  if (!writer.uri) {
    return null;
  }

  const agentNode = agentId ? <ViewKiSidebarWriterValue value={agentId} href={agentHref} /> : null;
  const agentTooltip = agentId
    ? i18n.translate('xpack.contextEngine.viewKi.writerProvenance.agentTooltip', {
        defaultMessage: 'agent {agentId}',
        values: { agentId },
      })
    : undefined;

  const writerNode = parsed ? (
    <FormattedMessage
      id="xpack.contextEngine.viewKi.writerProvenance.schemeDetail"
      defaultMessage="{scheme} {identifier}"
      values={{
        scheme: <span>{parsed.scheme.toLowerCase()}</span>,
        identifier: <ViewKiSidebarWriterValue value={parsed.identifier} href={writerHref} />,
      }}
    />
  ) : (
    <ViewKiSidebarWriterValue value={writer.uri} href={writerHref} />
  );

  const writerTooltip = parsed
    ? i18n.translate('xpack.contextEngine.viewKi.writerProvenance.schemeTooltip', {
        defaultMessage: '{scheme} {identifier}',
        values: { scheme: parsed.scheme.toLowerCase(), identifier: parsed.identifier },
      })
    : writer.uri;

  const tooltip = [agentTooltip, writerTooltip].filter(Boolean).join(' · ');

  if (agentNode) {
    return (
      <span title={tooltip}>
        <FormattedMessage
          id="xpack.contextEngine.viewKi.writerProvenance.agentWithWriterDetail"
          defaultMessage="agent {agent} with {writer}"
          values={{ agent: agentNode, writer: writerNode }}
        />
      </span>
    );
  }

  return <span title={tooltip}>{writerNode}</span>;
};
