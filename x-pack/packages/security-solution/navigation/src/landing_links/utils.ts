/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalId, type WrappedLinkProps } from '../links';

export const getWrappedLinkProps = ({
  id,
  skipUrlState,
  urlState,
  onLinkClick,
}: {
  id: string;
  skipUrlState?: boolean;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}): WrappedLinkProps => ({
  id,
  ...(!isExternalId(id) && !skipUrlState && { urlState }),
  ...(onLinkClick && { onClick: () => onLinkClick(id) }),
});
