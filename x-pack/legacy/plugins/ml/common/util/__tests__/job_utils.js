/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import {
  calculateDatafeedFrequencyDefaultSeconds,
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  isSourceDataChartableForDetector,
  isModelPlotChartableForDetector,
  getPartitioningFieldNames,
  isModelPlotEnabled,
  isJobVersionGte,
  mlFunctionToESAggregation,
  isJobIdValid,
  ML_MEDIAN_PERCENTS,
  prefixDatafeedId,
  getSafeAggregationName,
  getLatestDataOrBucketTimestamp,
} from '../job_utils';

describe('ML - job utils', () => {
  describe('calculateDatafeedFrequencyDefaultSeconds', () => {
    it('returns correct frequency for 119', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(119);
      expect(result).to.be(60);
    });
    it('returns correct frequency for 120', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(120);
      expect(result).to.be(60);
    });
    it('returns correct frequency for 300', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(300);
      expect(result).to.be(150);
    });
    it('returns correct frequency for 601', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(601);
      expect(result).to.be(300);
    });
    it('returns correct frequency for 43200', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43200);
      expect(result).to.be(600);
    });
    it('returns correct frequency for 43201', () => {
      const result = calculateDatafeedFrequencyDefaultSeconds(43201);
      expect(result).to.be(3600);
    });
  });

  describe('isTimeSeriesViewJob', () => {
    it('returns true when job has a single detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
      };

      expect(isTimeSeriesViewJob(job)).to.be(true);
    });

    it('returns true when job has at least one detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
            {
              function: 'freq_rare',
              by_field_name: 'uri',
              over_field_name: 'clientip',
              detector_description: 'Freq rare URI',
            },
          ],
        },
      };

      expect(isTimeSeriesViewJob(job)).to.be(true);
    });

    it('returns false when job does not have at least one detector with a metric function', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'varp',
              by_field_name: 'responsetime',
              detector_description: 'Varp responsetime',
            },
            {
              function: 'freq_rare',
              by_field_name: 'uri',
              over_field_name: 'clientip',
              detector_description: 'Freq rare URI',
            },
          ],
        },
      };

      expect(isTimeSeriesViewJob(job)).to.be(false);
    });

    it('returns false when job has a single count by category detector', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'count',
              by_field_name: 'mlcategory',
              detector_description: 'Count by category',
            },
          ],
        },
      };

      expect(isTimeSeriesViewJob(job)).to.be(false);
    });
  });

  describe('isTimeSeriesViewDetector', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'sum',
            field_name: 'bytes',
            partition_field_name: 'clientip',
            detector_description: 'High bytes client IP',
          }, // eslint-disable-line max-len
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
          {
            function: 'count',
            by_field_name: 'mlcategory',
            detector_description: 'Count by category',
          },
          { function: 'count', by_field_name: 'hrd', detector_description: 'count by hrd' },
          { function: 'mean', field_name: 'NetworkDiff', detector_description: 'avg NetworkDiff' },
        ],
      },
      datafeed_config: {
        script_fields: {
          hrd: {
            script: {
              inline: 'return domainSplit(doc["query"].value, params).get(1);',
              lang: 'painless',
            },
          },
          NetworkDiff: {
            script: {
              source: 'doc["NetworkOut"].value - doc["NetworkIn"].value',
              lang: 'painless',
            },
          },
        },
      },
    };

    it('returns true for a detector with a metric function', () => {
      expect(isTimeSeriesViewDetector(job, 0)).to.be(true);
    });

    it('returns false for a detector with a non-metric function', () => {
      expect(isTimeSeriesViewDetector(job, 1)).to.be(false);
    });

    it('returns false for a detector using count on an mlcategory field', () => {
      expect(isTimeSeriesViewDetector(job, 2)).to.be(false);
    });

    it('returns false for a detector using a script field as a by field', () => {
      expect(isTimeSeriesViewDetector(job, 3)).to.be(false);
    });

    it('returns false for a detector using a script field as a metric field_name', () => {
      expect(isTimeSeriesViewDetector(job, 4)).to.be(false);
    });
  });

  describe('isSourceDataChartableForDetector', () => {
    const job = {
      analysis_config: {
        detectors: [
          { function: 'count' }, // 0
          { function: 'low_count' }, // 1
          { function: 'high_count' }, // 2
          { function: 'non_zero_count' }, // 3
          { function: 'low_non_zero_count' }, // 4
          { function: 'high_non_zero_count' }, // 5
          { function: 'distinct_count' }, // 6
          { function: 'low_distinct_count' }, // 7
          { function: 'high_distinct_count' }, // 8
          { function: 'metric' }, // 9
          { function: 'mean' }, // 10
          { function: 'low_mean' }, // 11
          { function: 'high_mean' }, // 12
          { function: 'median' }, // 13
          { function: 'low_median' }, // 14
          { function: 'high_median' }, // 15
          { function: 'min' }, // 16
          { function: 'max' }, // 17
          { function: 'sum' }, // 18
          { function: 'low_sum' }, // 19
          { function: 'high_sum' }, // 20
          { function: 'non_null_sum' }, // 21
          { function: 'low_non_null_sum' }, // 22
          { function: 'high_non_null_sum' }, // 23
          { function: 'rare' }, // 24
          { function: 'count', by_field_name: 'mlcategory' }, // 25
          { function: 'count', by_field_name: 'hrd' }, // 26
          { function: 'freq_rare' }, // 27
          { function: 'info_content' }, // 28
          { function: 'low_info_content' }, // 29
          { function: 'high_info_content' }, // 30
          { function: 'varp' }, // 31
          { function: 'low_varp' }, // 32
          { function: 'high_varp' }, // 33
          { function: 'time_of_day' }, // 34
          { function: 'time_of_week' }, // 35
          { function: 'lat_long' }, // 36
          { function: 'mean', field_name: 'NetworkDiff' }, //37
        ],
      },
      datafeed_config: {
        script_fields: {
          hrd: {
            script: {
              inline: 'return domainSplit(doc["query"].value, params).get(1);',
              lang: 'painless',
            },
          },
          NetworkDiff: {
            script: {
              source: 'doc["NetworkOut"].value - doc["NetworkIn"].value',
              lang: 'painless',
            },
          },
        },
      },
    };

    it('returns true for expected detectors', () => {
      expect(isSourceDataChartableForDetector(job, 0)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 1)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 2)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 3)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 4)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 5)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 6)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 7)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 8)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 9)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 10)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 11)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 12)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 13)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 14)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 15)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 16)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 17)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 18)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 19)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 20)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 21)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 22)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 23)).to.be(true);
      expect(isSourceDataChartableForDetector(job, 24)).to.be(true);
    });

    it('returns false for expected detectors', () => {
      expect(isSourceDataChartableForDetector(job, 25)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 26)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 27)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 28)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 29)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 30)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 31)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 32)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 33)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 34)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 35)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 36)).to.be(false);
      expect(isSourceDataChartableForDetector(job, 37)).to.be(false);
    });
  });

  describe('isModelPlotChartableForDetector', () => {
    const job1 = {
      analysis_config: {
        detectors: [{ function: 'count' }],
      },
    };

    const job2 = {
      analysis_config: {
        detectors: [{ function: 'count' }, { function: 'info_content' }],
      },
      model_plot_config: {
        enabled: true,
      },
    };

    it('returns false when model plot is not enabled', () => {
      expect(isModelPlotChartableForDetector(job1, 0)).to.be(false);
    });

    it('returns true for count detector when model plot is enabled', () => {
      expect(isModelPlotChartableForDetector(job2, 0)).to.be(true);
    });

    it('returns true for info_content detector when model plot is enabled', () => {
      expect(isModelPlotChartableForDetector(job2, 1)).to.be(true);
    });
  });

  describe('getPartitioningFieldNames', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'count',
            detector_description: 'count',
          },
          {
            function: 'count',
            partition_field_name: 'clientip',
            detector_description: 'Count by clientip',
          },
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
          {
            function: 'sum',
            field_name: 'bytes',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            partition_field_name: 'method',
            detector_description: 'sum bytes',
          },
        ],
      },
    };

    it('returns empty array for a detector with no partitioning fields', () => {
      const resp = getPartitioningFieldNames(job, 0);
      expect(resp).to.be.an('array');
      expect(resp).to.be.empty();
    });

    it('returns expected array for a detector with a partition field', () => {
      const resp = getPartitioningFieldNames(job, 1);
      expect(resp).to.be.an('array');
      expect(resp).to.have.length(1);
      expect(resp).to.contain('clientip');
    });

    it('returns expected array for a detector with by and over fields', () => {
      const resp = getPartitioningFieldNames(job, 2);
      expect(resp).to.be.an('array');
      expect(resp).to.have.length(2);
      expect(resp).to.contain('uri');
      expect(resp).to.contain('clientip');
    });

    it('returns expected array for a detector with partition, by and over fields', () => {
      const resp = getPartitioningFieldNames(job, 3);
      expect(resp).to.be.an('array');
      expect(resp).to.have.length(3);
      expect(resp).to.contain('uri');
      expect(resp).to.contain('clientip');
      expect(resp).to.contain('method');
    });
  });

  describe('isModelPlotEnabled', () => {
    it('returns true for a job in which model plot has been enabled', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
        model_plot_config: {
          enabled: true,
        },
      };

      expect(isModelPlotEnabled(job, 0)).to.be(true);
    });

    it('returns expected values for a job in which model plot has been enabled with terms', () => {
      const job = {
        analysis_config: {
          detectors: [
            {
              function: 'max',
              field_name: 'responsetime',
              partition_field_name: 'country',
              by_field_name: 'airline',
            },
          ],
        },
        model_plot_config: {
          enabled: true,
          terms: 'US,AAL',
        },
      };

      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'US' },
          { fieldName: 'airline', fieldValue: 'AAL' },
        ])
      ).to.be(true);
      expect(isModelPlotEnabled(job, 0, [{ fieldName: 'country', fieldValue: 'US' }])).to.be(false);
      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'GB' },
          { fieldName: 'airline', fieldValue: 'AAL' },
        ])
      ).to.be(false);
      expect(
        isModelPlotEnabled(job, 0, [
          { fieldName: 'country', fieldValue: 'JP' },
          { fieldName: 'airline', fieldValue: 'JAL' },
        ])
      ).to.be(false);
    });

    it('returns true for jobs in which model plot has not been enabled', () => {
      const job1 = {
        analysis_config: {
          detectors: [
            {
              function: 'high_count',
              partition_field_name: 'status',
              detector_description: 'High count status code',
            },
          ],
        },
        model_plot_config: {
          enabled: false,
        },
      };
      const job2 = {};

      expect(isModelPlotEnabled(job1, 0)).to.be(false);
      expect(isModelPlotEnabled(job2, 0)).to.be(false);
    });
  });

  describe('isJobVersionGte', () => {
    const job = {
      job_version: '6.1.1',
    };

    it('returns true for later job version', () => {
      expect(isJobVersionGte(job, '6.1.0')).to.be(true);
    });
    it('returns true for equal job version', () => {
      expect(isJobVersionGte(job, '6.1.1')).to.be(true);
    });
    it('returns false for earlier job version', () => {
      expect(isJobVersionGte(job, '6.1.2')).to.be(false);
    });
  });

  describe('mlFunctionToESAggregation', () => {
    it('returns correct ES aggregation type for ML function', () => {
      expect(mlFunctionToESAggregation('count')).to.be('count');
      expect(mlFunctionToESAggregation('low_count')).to.be('count');
      expect(mlFunctionToESAggregation('high_count')).to.be('count');
      expect(mlFunctionToESAggregation('non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('low_non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('high_non_zero_count')).to.be('count');
      expect(mlFunctionToESAggregation('distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('low_distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('high_distinct_count')).to.be('cardinality');
      expect(mlFunctionToESAggregation('metric')).to.be('avg');
      expect(mlFunctionToESAggregation('mean')).to.be('avg');
      expect(mlFunctionToESAggregation('low_mean')).to.be('avg');
      expect(mlFunctionToESAggregation('high_mean')).to.be('avg');
      expect(mlFunctionToESAggregation('min')).to.be('min');
      expect(mlFunctionToESAggregation('max')).to.be('max');
      expect(mlFunctionToESAggregation('sum')).to.be('sum');
      expect(mlFunctionToESAggregation('low_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('high_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('low_non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('high_non_null_sum')).to.be('sum');
      expect(mlFunctionToESAggregation('rare')).to.be('count');
      expect(mlFunctionToESAggregation('freq_rare')).to.be(null);
      expect(mlFunctionToESAggregation('info_content')).to.be(null);
      expect(mlFunctionToESAggregation('low_info_content')).to.be(null);
      expect(mlFunctionToESAggregation('high_info_content')).to.be(null);
      expect(mlFunctionToESAggregation('median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('low_median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('high_median')).to.be('percentiles');
      expect(mlFunctionToESAggregation('varp')).to.be(null);
      expect(mlFunctionToESAggregation('low_varp')).to.be(null);
      expect(mlFunctionToESAggregation('high_varp')).to.be(null);
      expect(mlFunctionToESAggregation('time_of_day')).to.be(null);
      expect(mlFunctionToESAggregation('time_of_week')).to.be(null);
      expect(mlFunctionToESAggregation('lat_long')).to.be(null);
    });
  });

  describe('isJobIdValid', () => {
    it('returns true for job id: "good_job-name"', () => {
      expect(isJobIdValid('good_job-name')).to.be(true);
    });
    it('returns false for job id: "_bad_job-name"', () => {
      expect(isJobIdValid('_bad_job-name')).to.be(false);
    });
    it('returns false for job id: "bad_job-name_"', () => {
      expect(isJobIdValid('bad_job-name_')).to.be(false);
    });
    it('returns false for job id: "-bad_job-name"', () => {
      expect(isJobIdValid('-bad_job-name')).to.be(false);
    });
    it('returns false for job id: "bad_job-name-"', () => {
      expect(isJobIdValid('bad_job-name-')).to.be(false);
    });
    it('returns false for job id: "bad&job-name"', () => {
      expect(isJobIdValid('bad&job-name')).to.be(false);
    });
  });

  describe('ML_MEDIAN_PERCENTS', () => {
    it("is '50.0'", () => {
      expect(ML_MEDIAN_PERCENTS).to.be('50.0');
    });
  });

  describe('prefixDatafeedId', () => {
    it('returns datafeed-prefix-job from datafeed-job"', () => {
      expect(prefixDatafeedId('datafeed-job', 'prefix-')).to.be('datafeed-prefix-job');
    });

    it('returns datafeed-prefix-job from job"', () => {
      expect(prefixDatafeedId('job', 'prefix-')).to.be('datafeed-prefix-job');
    });
  });

  describe('getSafeAggregationName', () => {
    it('"foo" should be "foo"', () => {
      expect(getSafeAggregationName('foo', 0)).to.be('foo');
    });
    it('"foo.bar" should be "foo.bar"', () => {
      expect(getSafeAggregationName('foo.bar', 0)).to.be('foo.bar');
    });
    it('"foo&bar" should be "field_0"', () => {
      expect(getSafeAggregationName('foo&bar', 0)).to.be('field_0');
    });
  });

  describe('getLatestDataOrBucketTimestamp', () => {
    it('returns expected value when no gap in data at end of bucket processing', () => {
      expect(getLatestDataOrBucketTimestamp(1549929594000, 1549928700000)).to.be(1549929594000);
    });
    it('returns expected value when there is a gap in data at end of bucket processing', () => {
      expect(getLatestDataOrBucketTimestamp(1549929594000, 1562256600000)).to.be(1562256600000);
    });
    it('returns expected value when job has not run', () => {
      expect(getLatestDataOrBucketTimestamp(undefined, undefined)).to.be(undefined);
    });
  });
});
