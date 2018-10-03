/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { UserProfile } from './user_profile';
describe('UserProfile', () => {
  it('should return true when the specified capability is enabled', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test1')).toEqual(true);
  });
  it('should return false when the specified capability is disabled', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test2')).toEqual(false);
  });
  it('should return the default value when the specified capability is not defined', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test3')).toEqual(true);
    expect(userProfile.hasCapability('test3', false)).toEqual(false);
  });
});
