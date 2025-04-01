/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionId } from '@kbn/core-chrome-browser';

import type { SOLUTION_VIEW_CLASSIC } from '../../constants';

export type SolutionView = SolutionId | typeof SOLUTION_VIEW_CLASSIC;

/**
 * A Space.
 */
export interface Space {
  /**
   * The unique identifier for this space.
   * The id becomes part of the "URL Identifier" of the space.
   *
   * Example: an id of `marketing` would result in the URL identifier of `/s/marketing`.
   */
  id: string;

  /**
   * Display name for this space.
   */
  name: string;

  /**
   * Optional description for this space.
   */
  description?: string;

  /**
   * Optional color (hex code) for this space.
   * If neither `color` nor `imageUrl` is specified, then a color will be automatically generated.
   */
  color?: string;

  /**
   * Optional display initials for this space's avatar. Supports a maximum of 2 characters.
   * If initials are not provided, then they will be derived from the space name automatically.
   *
   * Initials are not displayed if an `imageUrl` has been specified.
   */
  initials?: string;

  /**
   * Optional base-64 encoded data image url to show as this space's avatar.
   * This setting takes precedence over any configured `color` or `initials`.
   */
  imageUrl?: string;

  /**
   * The set of feature ids that should be hidden within this space.
   */
  disabledFeatures: string[];

  /**
   * Indicates that this space is reserved (system controlled).
   * Reserved spaces cannot be created or deleted by end-users.
   * @private
   */
  _reserved?: boolean;

  /**
   * Solution selected for this space.
   */
  solution?: SolutionView;
}

/**
 * Controls how spaces are retrieved.
 */
export interface GetAllSpacesOptions {
  /**
   * An optional purpose describing how the set of spaces will be used.
   * The default purpose (`any`) will retrieve all spaces the user is authorized to see,
   * whereas a more specific purpose will retrieve all spaces the user is authorized to perform a specific action within.
   *
   * @see GetAllSpacesPurpose
   */
  purpose?: GetAllSpacesPurpose;

  /**
   * Set to true to return a set of flags indicating which purposes the user is authorized for.
   *
   * @see GetAllSpacesPurpose
   */
  includeAuthorizedPurposes?: boolean;
}

/**
 * The set of purposes to retrieve spaces:
 * - `any`: retrieves all spaces the user is authorized to see.
 * - `copySavedObjectsIntoSpace`: retrieves all spaces the user is authorized to copy saved objects into.
 * - `findSavedObjects`: retrieves all spaces the user is authorized to search within.
 * - `shareSavedObjectsIntoSpace`: retrieves all spaces the user is authorized to share saved objects into.
 */
export type GetAllSpacesPurpose =
  | 'any'
  | 'copySavedObjectsIntoSpace'
  | 'findSavedObjects'
  | 'shareSavedObjectsIntoSpace';

/**
 * Response format when querying for spaces.
 */
export interface GetSpaceResult extends Space {
  /**
   * A set of flags indicating which purposes the user is authorized for.
   */
  authorizedPurposes?: Record<GetAllSpacesPurpose, boolean>;
}
