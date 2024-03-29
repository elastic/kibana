/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsEcommerceMock = {
  indices: ['ft_ecommerce'],
  fields: {
    'products.manufacturer': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.discount_amount': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'products.base_unit_price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    type: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.discount_percentage': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'products._id.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    day_of_week_i: {
      integer: { type: 'integer', metadata_field: false, searchable: true, aggregatable: true },
    },
    total_quantity: {
      integer: { type: 'integer', metadata_field: false, searchable: true, aggregatable: true },
    },
    total_unique_products: {
      integer: { type: 'integer', metadata_field: false, searchable: true, aggregatable: true },
    },
    taxless_total_price: {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'geoip.continent_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    sku: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _version: {
      _version: { type: '_version', metadata_field: true, searchable: false, aggregatable: true },
    },
    'customer_full_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'category.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.taxless_price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'products.quantity': {
      integer: { type: 'integer', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    customer_first_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    customer_phone: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'geoip.region_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _tier: {
      keyword: { type: 'keyword', metadata_field: true, searchable: true, aggregatable: true },
    },
    _seq_no: {
      _seq_no: { type: '_seq_no', metadata_field: true, searchable: true, aggregatable: true },
    },
    customer_full_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'geoip.country_iso_code': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _source: {
      _source: { type: '_source', metadata_field: true, searchable: false, aggregatable: false },
    },
    _id: { _id: { type: '_id', metadata_field: true, searchable: true, aggregatable: false } },
    order_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products._id': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.product_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _index: {
      _index: { type: '_index', metadata_field: true, searchable: true, aggregatable: true },
    },
    'products.product_id': {
      long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.category': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.manufacturer.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    manufacturer: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    products: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'products.unit_discount_amount': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    customer_last_name: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'geoip.location': {
      geo_point: { type: 'geo_point', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.tax_amount': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'products.product_name': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'products.min_price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'manufacturer.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.taxful_price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    currency: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.base_price': {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    email: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    day_of_week: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.sku': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'customer_last_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    geoip: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'products.category.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'geoip.city_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    order_date: {
      date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true },
    },
    'customer_first_name.keyword': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'products.created_on': {
      date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true },
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
    customer_gender: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    taxful_total_price: {
      half_float: {
        type: 'half_float',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
  },
};
