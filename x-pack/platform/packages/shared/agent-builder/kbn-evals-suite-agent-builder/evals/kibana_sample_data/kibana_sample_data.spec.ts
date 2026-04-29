/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import {
  type EsqlRouteEvalExample,
  type EvaluateNlToEsqlRouteDataset,
  createEvaluateNlToEsqlRouteDataset,
} from '../esql/esql_eval_common';

const evaluate = base.extend<{ evaluateDataset: EvaluateNlToEsqlRouteDataset }, {}>({
  evaluateDataset: [
    async ({ fetch, executorClient, inferenceClient, log }, use) => {
      await use(
        createEvaluateNlToEsqlRouteDataset({
          fetch,
          executorClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

/** Appended to each `input.question` so NL→ES|QL targets the Kibana sample index for that scenario. */
const NL_INDEX_FLIGHTS = `\n\nTarget index: \`kibana_sample_data_flights\`. Use FROM with this index for the query.`;
const NL_INDEX_ECOMMERCE = `\n\nTarget index: \`kibana_sample_data_ecommerce\`. Use FROM with this index for the query.`;
const NL_INDEX_LOGS = `\n\nTarget index: \`kibana_sample_data_logs\`. Use FROM with this index for the query.`;

/**
 * Requires Kibana “Sample data” to be installed (Stack Management → or Home “Add data”):
 * - Sample flight data  → kibana_sample_data_flights
 * - Sample eCommerce    → kibana_sample_data_ecommerce
 * - Sample web logs     → kibana_sample_data_logs
 *
 * Goldens use field names from each dataset’s `field_mappings` under
 * `src/platform/plugins/shared/home/server/services/sample_data/data_sets/`
 * and `src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights/mappings.json`.
 */
const KIBANA_SAMPLE_DATA_EXAMPLES: EsqlRouteEvalExample[] = [
  // Flights — kibana_sample_data_flights
  {
    input: {
      question: `Which airline carriers have the highest cancellation rate?${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| STATS total_flights = COUNT(*), cancelled_flights = COUNT(*) WHERE Cancelled == true BY Carrier
| EVAL cancellation_rate = ROUND(cancelled_flights / total_flights * 100, 2)
| SORT cancellation_rate DESC
| KEEP Carrier, cancellation_rate, cancelled_flights, total_flights`,
    },
    metadata: {
      scenario_id: 'flights_carrier_cancellation_rate',
      sample_dataset: 'flights',
      category: 'rate_aggregation',
      difficulty: 'hard',
      query_intent: 'Analytical - ratio by dimension',
    },
  },
  {
    input: {
      question: `What's the average ticket price by destination country?${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| STATS avg_ticket_price = AVG(AvgTicketPrice) BY DestCountry`,
    },
    metadata: {
      scenario_id: 'flights_avg_price_by_dest_country',
      sample_dataset: 'flights',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - average by key',
    },
  },
  {
    input: {
      question: `Show me the top 10 routes with the longest average delay in minutes${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| STATS avg_delay = AVG(FlightDelayMin) BY Origin, Dest
| SORT avg_delay DESC
| LIMIT 10`,
    },
    metadata: {
      scenario_id: 'flights_top_routes_by_avg_delay',
      sample_dataset: 'flights',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - top n',
    },
  },
  {
    input: {
      question: `How does weather at the origin affect flight delays?${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| STATS total_flights = COUNT(*),
        delayed_flights = COUNT(*) WHERE FlightDelay == true,
        avg_delay_min = AVG(FlightDelayMin),
        avg_delay_min_delayed_only = AVG(FlightDelayMin) WHERE FlightDelay == true
  BY OriginWeather
| EVAL delay_pct = ROUND(delayed_flights * 100.0 / total_flights, 1)
| SORT delay_pct DESC`,
    },
    metadata: {
      scenario_id: 'flights_delay_by_origin_weather',
      sample_dataset: 'flights',
      category: 'exploratory',
      difficulty: 'medium',
      query_intent: 'Analytical - group metrics',
    },
  },
  {
    input: {
      question: `What's the distribution of flight distances in kilometers?${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| STATS count = COUNT(*) BY distance_range = BUCKET(DistanceKilometers, 20, 0, 20000)
| SORT distance_range`,
    },
    metadata: {
      scenario_id: 'flights_distance_distribution',
      sample_dataset: 'flights',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - distribution',
    },
  },
  {
    input: {
      question: `Compare average ticket prices on weekdays vs weekends${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| EVAL day_type = CASE(
    dayOfWeek == 0 OR dayOfWeek == 6, "Weekend",
    "Weekday"
  )
| STATS avg_price = AVG(AvgTicketPrice) BY day_type
| SORT day_type`,
    },
    metadata: {
      scenario_id: 'flights_weekend_vs_weekday_price',
      sample_dataset: 'flights',
      category: 'segmentation',
      difficulty: 'medium',
      query_intent: 'Analytical - compare segments',
    },
  },
  {
    input: {
      question: `Which destination cities have the most cancelled flights?${NL_INDEX_FLIGHTS}`,
    },
    output: {
      query: `FROM kibana_sample_data_flights
| WHERE Cancelled == true
| STATS flight_count = COUNT(*) BY DestCityName
| SORT flight_count DESC`,
    },
    metadata: {
      scenario_id: 'flights_cancellations_by_dest_city',
      sample_dataset: 'flights',
      category: 'filter_aggregation',
      difficulty: 'easy',
      query_intent: 'Analytical - count by key',
    },
  },
  // eCommerce — kibana_sample_data_ecommerce
  {
    input: {
      question: `What are the top-selling product categories by revenue?${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS revenue = SUM(taxful_total_price) BY category.keyword
| SORT revenue DESC`,
    },
    metadata: {
      scenario_id: 'ecom_revenue_by_product_category',
      sample_dataset: 'ecommerce',
      category: 'nested_aggregation',
      difficulty: 'hard',
      query_intent: 'Analytical - sum by group',
    },
  },
  {
    input: {
      question: `Show me average order value by day of week${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS avg_order_value = AVG(taxful_total_price) BY day_of_week
| SORT day_of_week ASC`,
    },
    metadata: {
      scenario_id: 'ecom_aov_by_day_of_week',
      sample_dataset: 'ecommerce',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - average by key',
    },
  },
  {
    input: {
      question: `Which manufacturers generate the most revenue?${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS revenue = SUM(taxful_total_price) BY manufacturer.keyword
| SORT revenue DESC`,
    },
    metadata: {
      scenario_id: 'ecom_revenue_by_manufacturer',
      sample_dataset: 'ecommerce',
      category: 'nested_aggregation',
      difficulty: 'hard',
      query_intent: 'Analytical - sum by group',
    },
  },
  {
    input: {
      question: `What's the average discount percentage by product category?${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS avg_discount = AVG(products.discount_percentage) BY category.keyword
| SORT avg_discount DESC`,
    },
    metadata: {
      scenario_id: 'ecom_avg_discount_by_category',
      sample_dataset: 'ecommerce',
      category: 'nested_aggregation',
      difficulty: 'hard',
      query_intent: 'Analytical - average by group',
    },
  },
  {
    input: {
      question: `Show me the top 10 customers by total spend${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS total_spend = SUM(taxful_total_price) BY customer_full_name.keyword
| SORT total_spend DESC
| LIMIT 10`,
    },
    metadata: {
      scenario_id: 'ecom_top_customers_by_spend',
      sample_dataset: 'ecommerce',
      category: 'ranking',
      difficulty: 'medium',
      query_intent: 'Analytical - top n',
    },
  },
  {
    input: {
      question: `How does order volume vary by continent?${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS order_count = COUNT(*) BY geoip.continent_name
| SORT order_count DESC`,
    },
    metadata: {
      scenario_id: 'ecom_order_volume_by_continent',
      sample_dataset: 'ecommerce',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - count by geo',
    },
  },
  {
    input: {
      question: `What's the gender breakdown of customers and their average spend?${NL_INDEX_ECOMMERCE}`,
    },
    output: {
      query: `FROM kibana_sample_data_ecommerce
| STATS order_count = COUNT(*), avg_spend = AVG(taxful_total_price) BY customer_gender
| SORT customer_gender`,
    },
    metadata: {
      scenario_id: 'ecom_gender_spend',
      sample_dataset: 'ecommerce',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - two metrics by key',
    },
  },
  // Web logs — kibana_sample_data_logs
  {
    input: {
      question: `What percentage of requests result in errors (404 or 503)?${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| STATS total = COUNT(*), errors = COUNT(*) WHERE response.keyword == "404" OR response.keyword == "503"
| EVAL error_percentage = ROUND(errors * 100.0 / total, 2)
| KEEP error_percentage, errors, total`,
    },
    metadata: {
      scenario_id: 'logs_error_pct_404_503',
      sample_dataset: 'logs',
      category: 'rate',
      difficulty: 'hard',
      query_intent: 'Analytical - ratio',
    },
  },
  {
    input: {
      question: `Which source countries generate the most traffic?${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| STATS traffic = COUNT(*) BY geo.src
| SORT traffic DESC`,
    },
    metadata: {
      scenario_id: 'logs_traffic_by_source_country',
      sample_dataset: 'logs',
      category: 'aggregation',
      difficulty: 'easy',
      query_intent: 'Analytical - count by geo',
    },
  },
  {
    input: {
      question: `Show me the top requesting IPs and their average bytes transferred${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| STATS requests = COUNT(*), avg_bytes = AVG(bytes) BY clientip
| SORT requests DESC
| LIMIT 10`,
    },
    metadata: {
      scenario_id: 'logs_top_ips_avg_bytes',
      sample_dataset: 'logs',
      category: 'ranking',
      difficulty: 'medium',
      query_intent: 'Analytical - two metrics, top n',
    },
  },
  {
    input: {
      question: `What's the error rate trend over time?${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| EVAL is_error = CASE(response.keyword >= "400", 1, 0)
| STATS total_requests = COUNT(*), errors = SUM(is_error) BY time_bucket = BUCKET(@timestamp, 50, ?_tstart, ?_tend)
| EVAL error_rate = ROUND(errors / total_requests * 100, 2)
| SORT time_bucket
| KEEP time_bucket, total_requests, errors, error_rate`,
    },
    metadata: {
      scenario_id: 'logs_error_rate_time_series',
      sample_dataset: 'logs',
      category: 'time_series',
      difficulty: 'hard',
      query_intent: 'Analytical - trend',
    },
  },
  {
    input: {
      question: `Which file extensions have the highest average response size?${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| STATS avg_bytes = AVG(bytes) BY extension.keyword
| SORT avg_bytes DESC`,
    },
    metadata: {
      scenario_id: 'logs_avg_bytes_by_extension',
      sample_dataset: 'logs',
      category: 'aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - average by key',
    },
  },
  {
    input: {
      question: `Break down response codes by operating system${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY response.keyword, machine.os.keyword
| SORT machine.os.keyword, response.keyword`,
    },
    metadata: {
      scenario_id: 'logs_response_by_os',
      sample_dataset: 'logs',
      category: 'multi_key_aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - 2D breakdown',
    },
  },
  {
    input: {
      question: `Are there any IPs generating an unusually high number of 503 errors?${NL_INDEX_LOGS}`,
    },
    output: {
      query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend AND response.keyword == "503"
| STATS error_count = COUNT(*) BY clientip
| SORT error_count DESC`,
    },
    metadata: {
      scenario_id: 'logs_top_503_by_ip',
      sample_dataset: 'logs',
      category: 'filter_aggregation',
      difficulty: 'medium',
      query_intent: 'Analytical - find heavy hitters',
    },
  },
];

evaluate.describe('ES|QL: Kibana sample data', { tag: tags.serverless.search }, () => {
  evaluate(
    'NL to ES|QL (POST /internal/esql/nl_to_esql) — Flights, eCommerce, web logs',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'esql: Kibana sample data (Flights, eCommerce, web logs)',
          description:
            'Install all three Kibana sample datasets. Goldens match sample-data field names; the judge scores functional ES|QL equivalence, not string equality.',
          examples: KIBANA_SAMPLE_DATA_EXAMPLES,
        },
      });
    }
  );
});
