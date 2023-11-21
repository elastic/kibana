/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isSecurityId, type WrappedLinkProps } from '../links';
import type { NavigationLink } from '../types';

export const getKibanaLinkProps = ({
  item,
  urlState,
  onLinkClick,
}: {
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}): WrappedLinkProps => ({
  id: item.id,
  ...(isSecurityId(item.id) && !item.skipUrlState && { urlState }),
  ...(onLinkClick && { onClick: () => onLinkClick(item.id) }),
});
