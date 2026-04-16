/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Observable } from 'rxjs';

export interface UserMenuLink {
  label: string;
  iconType: IconType;
  href?: string;
  order?: number;
  setAsProfile?: boolean;
  onClick?: () => void;
}

export interface SecurityNavControlServiceStart {
  /**
   * Returns an Observable of the array of user menu links (the links that show up under the user's Avatar in the UI) registered by other plugins
   */
  getUserMenuLinks$: () => Observable<UserMenuLink[]>;

  /**
   * Registers the provided user menu links to be displayed in the user menu (the links that show up under the user's Avatar in the UI).
   */
  addUserMenuLinks: (newUserMenuLink: UserMenuLink[]) => void;
}
