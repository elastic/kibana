/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// From x-pack/platform/plugins/private/monitoring/public/lib/elasticsearch_settings/enabler.js
export class Enabler {
  http: any;
  updateModel: any;

  constructor(http: any, updateModel: (properties: any) => void) {
    this.http = http;
    this.updateModel = updateModel;
  }

  async enableCollectionInterval() {
    try {
      this.updateModel({ isCollectionIntervalUpdating: true });

      await this.http.fetch('../api/monitoring/v1/elasticsearch_settings/set/collection_interval', {
        method: 'PUT',
      });
      this.updateModel({
        isCollectionIntervalUpdated: true,
        isCollectionIntervalUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: (err as any).data,
        isCollectionIntervalUpdated: false,
        isCollectionIntervalUpdating: false,
      });
    }
  }

  async enableCollectionEnabled() {
    try {
      this.updateModel({ isCollectionEnabledUpdating: true });
      await this.http.fetch('../api/monitoring/v1/elasticsearch_settings/set/collection_enabled', {
        method: 'PUT',
      });

      this.updateModel({
        isCollectionEnabledUpdated: true,
        isCollectionEnabledUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: (err as any).data,
        isCollectionEnabledUpdated: false,
        isCollectionEnabledUpdating: false,
      });
    }
  }
}
