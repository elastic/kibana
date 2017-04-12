import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
      .then(function () {
        log.debug('clickMetric');
        return PageObjects.visualize.clickMetric();
      })
      .then(function clickNewSearch() {
        return PageObjects.visualize.clickNewSearch();
      })
      .then(function setAbsoluteRange() {
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      });
    });

    describe('metric chart', function indexPatternCreation() {

      it('should show Count', function () {
        const expectedCount = ['14,004', 'Count'];

        // initial metric of "Count" is selected by default
        return retry.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
          .then(function (metricValue) {
            PageObjects.common.saveScreenshot('Visualize-metric-chart');
            expect(expectedCount).to.eql(metricValue.split('\n'));
          });
        });
      });

      it('should show Average', function () {
        const avgMachineRam = ['13,104,036,080.615', 'Average machine.ram'];
        return PageObjects.visualize.clickMetricEditor()
        .then(function () {
          log.debug('Aggregation = Average');
          return PageObjects.visualize.selectAggregation('Average');
        })
        .then(function selectField() {
          log.debug('Field = machine.ram');
          return PageObjects.visualize.selectField('machine.ram', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(avgMachineRam).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Sum', function () {
        const sumPhpMemory = ['85,865,880', 'Sum of phpmemory'];
        log.debug('Aggregation = Sum');
        return PageObjects.visualize.selectAggregation('Sum')
        .then(function selectField() {
          log.debug('Field = phpmemory');
          return PageObjects.visualize.selectField('phpmemory', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(sumPhpMemory).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Median', function () {
        const medianBytes = ['5,565.263', '50th percentile of bytes'];
        //  For now, only comparing the text label part of the metric
        log.debug('Aggregation = Median');
        return PageObjects.visualize.selectAggregation('Median')
        .then(function selectField() {
          log.debug('Field = bytes');
          return PageObjects.visualize.selectField('bytes', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                // only comparing the text label!
                expect(medianBytes[1]).to.eql(metricValue.split('\n')[1]);
              });
          });
        });
      });

      it('should show Min', function () {
        const minTimestamp = ['September 20th 2015, 00:00:00.000', 'Min @timestamp'];
        log.debug('Aggregation = Min');
        return PageObjects.visualize.selectAggregation('Min')
        .then(function selectField() {
          log.debug('Field = @timestamp');
          return PageObjects.visualize.selectField('@timestamp', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(minTimestamp).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Max', function () {
        const maxRelatedContentArticleModifiedTime = ['April 4th 2015, 00:54:41.000', 'Max relatedContent.article:modified_time'];
        log.debug('Aggregation = Max');
        return PageObjects.visualize.selectAggregation('Max')
        .then(function selectField() {
          log.debug('Field = relatedContent.article:modified_time');
          return PageObjects.visualize.selectField('relatedContent.article:modified_time', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Standard Deviation', function () {
        const standardDeviationBytes = [
          '-1,435.138', 'Lower Standard Deviation of bytes',
          '12,889.766', 'Upper Standard Deviation of bytes'
        ];
        log.debug('Aggregation = Standard Deviation');
        return PageObjects.visualize.selectAggregation('Standard Deviation')
        .then(function selectField() {
          log.debug('Field = bytes');
          return PageObjects.visualize.selectField('bytes', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(standardDeviationBytes).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Unique Count', function () {
        const uniqueCountClientip = ['1,000', 'Unique count of clientip'];
        log.debug('Aggregation = Unique Count');
        return PageObjects.visualize.selectAggregation('Unique Count')
        .then(function selectField() {
          log.debug('Field = clientip');
          return PageObjects.visualize.selectField('clientip', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
              });
          });
        })
        .then(function () {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              log.debug('metricValue=' + metricValue.split('\n'));
              expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
            });
        });
      });

      it('should show Percentiles', function () {
        const percentileMachineRam = [
          '2,147,483,648', '1st percentile of machine.ram',
          '3,221,225,472', '5th percentile of machine.ram',
          '7,516,192,768', '25th percentile of machine.ram',
          '12,884,901,888', '50th percentile of machine.ram',
          '18,253,611,008', '75th percentile of machine.ram',
          '32,212,254,720', '95th percentile of machine.ram',
          '32,212,254,720', '99th percentile of machine.ram'
        ];

        log.debug('Aggregation = Percentiles');
        return PageObjects.visualize.selectAggregation('Percentiles')
        .then(function selectField() {
          log.debug('Field =  machine.ram');
          return PageObjects.visualize.selectField('machine.ram', 'metrics');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(percentileMachineRam).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

      it('should show Percentile Ranks', function () {
        const percentileRankBytes = [ '2.036%', 'Percentile rank 99 of "memory"'];
        log.debug('Aggregation = Percentile Ranks');
        return PageObjects.visualize.selectAggregation('Percentile Ranks')
        .then(function selectField() {
          log.debug('Field =  bytes');
          return PageObjects.visualize.selectField('memory', 'metrics');
        })
        .then(function selectField() {
          log.debug('Values =  99');
          return PageObjects.visualize.setValue('99');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.getMetric()
              .then(function (metricValue) {
                expect(percentileRankBytes).to.eql(metricValue.split('\n'));
              });
          });
        });
      });

    });
  });
}
