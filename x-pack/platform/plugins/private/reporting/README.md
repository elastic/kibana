# Kibana Reporting Plugin

This plugin provides reporting capabilities for Kibana. Combined with integration code from Kibana applications, users can generate reports of various types of content, such as visualizations, dashboards, and Discover sessions.

## CSV Export Types

### csv_v2 (Recommended)

This endpoint uses a **locator-based architecture** and is the modern, recommended approach for CSV exports. It supports:

- ✅ **Saved searches** (by `savedSearchId`) - Reference existing saved searches by their ID
- ✅ **Inline/ad-hoc searches** (by `dataViewId` + inline parameters) - Provide search criteria directly
- ✅ **ES|QL queries** - Support for the new Elasticsearch Query Language
- ✅ **Automation-friendly API** - Cleaner signature designed for programmatic use

This API is **feature-complete** and ready for production use. It will replace `csv_searchsource` in the UI.

**Example - Saved Search:**
```typescript
{
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: { savedSearchId: 'my-saved-search-id' },
    version: '9.2.0'
  }]
}
```

**Example - Inline Search:**
```typescript
{
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: {
      dataViewId: 'logs-*',
      columns: ['@timestamp', 'message'],
      query: { language: 'kuery', query: 'level: error' },
      timeRange: { from: 'now-24h', to: 'now' }
    },
    version: '9.2.0'
  }]
}
```

### csv_searchsource (Deprecated)

This is the **legacy endpoint** that is no longer used in the Discover UI. It uses a SearchSource-based API that is tightly coupled to internal Data plugin structures.

⚠️ **Deprecation Notice:** This endpoint exists for backwards compatibility, as automated reports and external integrations may still be using it. New integrations should use `csv_v2` instead.

**Migration Path:** The locator-based `csv_v2` API provides equivalent functionality with better maintainability and feature support. See the [CSV Export Types README](../../src/platform/packages/private/kbn-reporting/export_types/csv/README.md) for migration guidance.

## Generate CSV
Although historically related to reporting, the CsvGenerator class has now be moved into its own package `@kbn/generate-csv`. 

## Serverless configuration
There are several improvements made for reporting in serverless environments. Most changes are reflected in `reporting/server/config/schema.ts` for reference. 

PNG and PDF reports are currently not possible in serverless. Those export types are not enabled in serverless configuration, and are left out of Reporting's internal registry of export types.
