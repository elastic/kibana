# Lens Suggestions API

This document provides an overview of the Lens Suggestions API. It is used mostly for suggesting ES|QL charts based on an ES|QL query. It is used by the observability assistant, Discover and Dashboards ES|QL charts.

## Overview

The Lens Suggestions API is designed to provide suggestions for visualizations based on a given ES|QL query. It helps users to quickly find the most relevant visualizations for their data.

## Getting Started

To use the Lens Suggestions API, you need to import it from the Lens plugin:

```typescript
import useAsync from 'react-use/lib/useAsync';

const lensHelpersAsync = useAsync(() => {
    return lensService?.stateHelperApi() ?? Promise.resolve(null);
  }, [lensService]);

  if (lensHelpersAsync.value) {
    const suggestionsApi = lensHelpersAsync.value.suggestions;
  }
```

## The api

The api returns an array of suggestions.

#### Parameters

  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
  preferredChartType?: ChartType;
  preferredVisAttributes?: TypedLensByValueInput['attributes'];

- `context`: The context as descibed by the VisualizeFieldContext. 
- `dataView`: The dataView, can be an adhoc one too. For ES|QL you can create a dataview like this

```typescript
const indexName = (await getIndexForESQLQuery({ dataViews })) ?? '*';
const dataView = await getESQLAdHocDataview(`from ${indexName}`, dataViews);
```
Optional parameters:
- `preferredChartType`: Use this if you want the suggestions api to prioritize a specific suggestion type.
- `preferredVisAttributes`: Use this with the preferredChartType if you want to prioritize a specific suggestion type with a non-default visualization state.

#### Returns

An array of suggestion objects

## Example Usage

```typescript
const abc = new AbortController();

const columns = await getESQLQueryColumns({
  esqlQuery,
  search: dataService.search.search,
  signal: abc.signal,
  timeRange: dataService.query.timefilter.timefilter.getAbsoluteTime(),
});

const context = {
  dataViewSpec: dataView?.toSpec(false),
  fieldName: '',
  textBasedColumns: columns,
  query: { esql: esqlQuery },
};

const chartSuggestions = lensHelpersAsync.value.suggestions(context, dataView);

suggestions.forEach(suggestion => {
  console.log(`Suggestion: ${suggestion.title}, Score: ${suggestion.score}`);
});
```