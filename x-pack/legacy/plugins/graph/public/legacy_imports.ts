/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/angular-bootstrap';
import 'ace';

export { SavedObject, SavedObjectKibanaServices } from 'ui/saved_objects/types';
export { configureAppAngularModule } from 'ui/legacy_compat';
// @ts-ignore
export { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
export { confirmModalFactory } from 'ui/modals/confirm_modal';
// @ts-ignore
export { addAppRedirectMessageToUrl } from 'ui/notify';
export { SaveResult } from 'ui/saved_objects/show_saved_object_save_modal';
export { createSavedObjectClass } from 'ui/saved_objects/saved_object';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
