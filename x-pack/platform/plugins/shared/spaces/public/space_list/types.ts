/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Properties for the SpaceList component.
 */
export interface SpaceListProps {
  /**
   * The namespaces of a saved object to render into a corresponding list of spaces.
   */
  namespaces: string[];
  /**
   * Optional limit to the number of spaces that can be displayed in the list. If the number of spaces exceeds this limit, they will be
   * hidden behind a "show more" button. Set to 0 to disable.
   *
   * Default value is 5.
   */
  displayLimit?: number;
  /**
   * When set to 'within-space' (default), the space list behaves like it is running on a page within the active space, and it will omit the
   * active space (e.g., it displays a list of all the _other_ spaces that an object is shared to).
   *
   * Conversely, when set to 'outside-space', the space list behaves like it is running on a page outside of any space, so it will not omit
   * the active space.
   */
  behaviorContext?: 'within-space' | 'outside-space';
  /**
   * Click handler for spaces list, specifically excluding expand and contract buttons.
   */
  listOnClick?: () => void;
  /**
   * Style for the cursor when mousing over space avatars.
   */
  cursorStyle?: string;
}
