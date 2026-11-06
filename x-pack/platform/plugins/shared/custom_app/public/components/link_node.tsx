/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type MouseEvent } from 'react';
import { EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import { useDataLayer } from '../data/data_layer_context';
import { toEsqlVariables } from '../data/esql_variables';
import { useStateValues } from '../runtime/app_runtime_context';
import { getServices } from '../services';
import { useSubjectValue } from '../utils/use_subject_value';
import { resolveLink } from './link_target';

/**
 * A link to another page of Kibana: the query of a component opened in Discover, a page of an
 * application, or another custom app. It is a real link, which can be opened in another tab, and a
 * plain click goes there without leaving the page. A link that cannot be followed, because what it
 * points at is not there or not allowed, is shown as text that says why.
 */
export const LinkNode = ({ node }: { node: AppNodeOfType<'link'> }) => {
  const { core, share } = getServices();
  const layer = useDataLayer();
  const state = useStateValues();
  const context = useSubjectValue(layer.context$);

  const link = useMemo(
    () =>
      resolveLink({
        to: node.to,
        state,
        queryValues: Object.fromEntries(
          toEsqlVariables(context ?? { esqlVariables: undefined }, state).map(({ key, value }) => [
            key,
            value,
          ])
        ),
        timeRange: context?.timeRange,
        getSource: layer.getSourceDefinition,
        application: core.application,
        share,
      }),
    [node.to, state, context, layer, core.application, share]
  );
  const label = interpolate(node.label, state);

  if (link.status === 'unavailable') {
    return (
      <div data-node-id={node.id}>
        <EuiToolTip content={link.reason}>
          <EuiText size="s" color="subdued" tabIndex={0} data-test-subj="customAppLinkUnavailable">
            {label}
          </EuiText>
        </EuiToolTip>
      </div>
    );
  }

  return (
    <div data-node-id={node.id}>
      <EuiLink
        href={link.href}
        onClick={(event: MouseEvent) => {
          // Another tab, or a window, is what the address is for.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          link.navigate();
        }}
        data-test-subj="customAppLink"
      >
        {label}
      </EuiLink>
    </div>
  );
};
