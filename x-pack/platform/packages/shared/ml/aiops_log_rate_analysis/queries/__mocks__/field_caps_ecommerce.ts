/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsEcommerceMock = {
  indices: ['kibana_sample_data_ecommerce'],
  fields: {
    'products.manufacturer': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products._id': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.product_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.category': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.manufacturer.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    type: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    manufacturer: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    products: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    customer_last_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products._id.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.product_name': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'manufacturer.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    currency: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'geoip.continent_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    event: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    sku: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    email: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'customer_full_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    day_of_week: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'customer_last_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.sku': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'category.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    geoip: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    customer_first_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    customer_phone: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.category.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'geoip.city_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'geoip.region_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'customer_first_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    customer_full_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'geoip.country_iso_code': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    category: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    customer_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    user: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    order_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.dataset': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    customer_gender: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};
