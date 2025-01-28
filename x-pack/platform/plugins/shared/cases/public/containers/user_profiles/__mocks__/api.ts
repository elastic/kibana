/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/security-plugin/common';
import { userProfiles, suggestionUserProfiles } from '../api.mock';

export const suggestUserProfiles = async (): Promise<UserProfile[]> => suggestionUserProfiles;

export const bulkGetUserProfiles = async (): Promise<UserProfile[]> => userProfiles;

export const getCurrentUserProfile = async (): Promise<UserProfile> => userProfiles[0];
