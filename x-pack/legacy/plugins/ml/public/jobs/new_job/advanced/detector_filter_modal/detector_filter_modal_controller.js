/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import angular from 'angular';

import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlDetectorFilterModal', function ($scope, $modalInstance, params) {
  const msgs = mlMessageBarService;
  msgs.clear();
  $scope.title = i18n.translate('xpack.ml.newJob.advanced.detectorFilterModal.addNewFilterTitle', {
    defaultMessage: 'Add new filter'
  });
  $scope.detector = params.detector;
  $scope.saveLock = false;
  $scope.editMode = false;
  let index = -1;
  const add = params.add;
  const validate = params.validate;

  $scope.updateButtonLabel = i18n.translate('xpack.ml.newJob.advanced.detectorFilterModal.updateButtonLabel', {
    defaultMessage: 'Update'
  });
  $scope.addButtonLabel = i18n.translate('xpack.ml.newJob.advanced.detectorFilterModal.addButtonLabel', {
    defaultMessage: 'Add'
  });

  /*
  $scope.functions = [
    {id: 'count',                 uri: 'count.html#count'},
    {id: 'low_count',             uri: 'count.html#count'},
    {id: 'high_count',            uri: 'count.html#count'},
    {id: 'non_zero_count',        uri: 'count.html#non-zero-count'},
    {id: 'low_non_zero_count',    uri: 'count.html#non-zero-count'},
    {id: 'high_non_zero_count',   uri: 'count.html#non-zero-count'},
    {id: 'distinct_count',        uri: 'count.html#distinct-count'},
    {id: 'low_distinct_count',    uri: 'count.html#distinct-count'},
    {id: 'high_distinct_count',   uri: 'count.html#distinct-count'},
    {id: 'rare',                  uri: 'rare.html#rare'},
    {id: 'freq_rare',             uri: 'rare.html#freq-rare'},
    {id: 'info_content',          uri: 'info_content.html#info-content'},
    {id: 'low_info_content',      uri: 'info_content.html#info-content'},
    {id: 'high_info_content',     uri: 'info_content.html#info-content'},
    {id: 'metric',                uri: 'metric.html#metric'},
    {id: 'mean',                  uri: 'metric.html#mean'},
    {id: 'low_mean',              uri: 'metric.html#mean'},
    {id: 'high_mean',             uri: 'metric.html#mean'},
    {id: 'min',                   uri: 'metric.html#min'},
    {id: 'max',                   uri: 'metric.html#max'},
    {id: 'varp',                  uri: 'metric.html#varp'},
    {id: 'low_varp',              uri: 'metric.html#varp'},
    {id: 'high_varp',             uri: 'metric.html#varp'},
    {id: 'sum',                   uri: 'sum.html#sum'},
    {id: 'low_sum',               uri: 'sum.html#sum'},
    {id: 'high_sum',              uri: 'sum.html#sum'},
    {id: 'non_null_sum',          uri: 'sum.html#non-null-sum'},
    {id: 'low_non_null_sum',      uri: 'sum.html#non-null-sum'},
    {id: 'high_non_null_sum',     uri: 'sum.html#non-null-sum'},
    {id: 'time_of_day',           uri: 'time.html#time-of-day'},
    {id: 'time_of_week',          uri: 'time.html#time-of-week'},
    {id: 'lat_long',              uri: 'geographic.html'},
  ];
*/
  $scope.fields = [];
  if ($scope.detector.field_name) {
    $scope.fields.push($scope.detector.field_name);
  }
  if ($scope.detector.by_field_name) {
    $scope.fields.push($scope.detector.by_field_name);
  }
  if ($scope.detector.over_field_name) {
    $scope.fields.push($scope.detector.over_field_name);
  }
  if ($scope.detector.partition_field_name) {
    $scope.fields.push($scope.detector.partition_field_name);
  }


  // creating a new filter
  if (params.filter === undefined) {
    $scope.filter = {
      ruleAction: 'filter_results',
      target_field_name: '',
      target_field_value: '',
      conditions_connective: 'or',
      conditions: [],
      value_list: []
    };
  } else {
    // editing an existing filter
    $scope.editMode = true;
    $scope.filter = params.filter;
    $scope.title = i18n.translate('xpack.ml.newJob.advanced.detectorFilterModal.editFilterTitle', {
      defaultMessage: 'Edit filter'
    });
    index = params.index;
  }

  $scope.ui = {
    ruleAction: ['filter_results'],
    target_field_name: '',
    target_field_value: '',
    conditions_connective: ['or', 'and'],
    ruleCondition: {
      condition_type: [{
        label: 'actual',
        value: 'numerical_actual'
      }, {
        label: 'typical',
        value: 'numerical_typical'
      }, {
        label: '|actual - typical|',
        value: 'numerical_diff_abs'
      }/*, {
        label: 'Categorical',
        value: 'categorical'
      }*/
      ],
      field_name: '',
      field_value: '',
      condition: {
        operator: [{
          label: '<',
          value: 'lt'
        }, {
          label: '>',
          value: 'gt'
        }, {
          label: '<=',
          value: 'lte'
        }, {
          label: '>=',
          value: 'gte'
        }]
      },
      value_list: []
    }
  };

  $scope.addNewCondition = function () {
    $scope.filter.conditions.push({
      condition_type: 'numerical_actual',
      field_name: '',
      field_value: '',
      condition: {
        operator: 'lt',
        value: ''
      }
    });
  };

  $scope.removeCondition = function (idx) {
    $scope.filter.conditions.splice(idx, 1);
  };


  // console.log('MlDetectorFilterModal detector:', $scope.detector)

  $scope.helpLink = {};

  // $scope.functionChange = function() {
  //   const func = _.findWhere($scope.functions, {id: $scope.detector.function});
  //   $scope.helpLink.uri = 'functions/';
  //   $scope.helpLink.label = 'Help for ';

  //   if (func) {
  //     $scope.helpLink.uri += func.uri;
  //     $scope.helpLink.label += func.id;
  //   } else {
  //     $scope.helpLink.uri += 'functions.html';
  //     $scope.helpLink.label += 'analytical functions';
  //   }
  // };

  // $scope.functionChange();

  $scope.save = function () {
    const filter = angular.copy($scope.filter);

    if (!filter.conditions.length) {
      return;
    }
    $scope.saveLock = true;

    // remove any properties that aren't being used
    if (filter.target_field_name === '') {
      delete filter.target_field_name;
    }
    if (filter.target_field_value === '') {
      delete filter.target_field_value;
    }

    _.each(filter.conditions, (cond) => {
      delete cond.$$hashKey;
      if (cond.field_name === '') {
        delete cond.field_vname;
      }
      if (cond.fieldValue === '') {
        delete cond.fieldValue;
      }
    });

    if (filter.value_list && filter.value_list.length === 0) {
      delete filter.value_list;
    }

    // make a local copy of the detector, add the new filter
    // and send it off for validation.
    // if it passes, add the filter to the real detector.
    const dtr = angular.copy($scope.detector);
    if (dtr.rules === undefined) {
      dtr.rules = [];
    }

    if (index >= 0) {
      dtr.rules[index] = filter;
    } else {
      dtr.rules.push(filter);
    }

    validate(dtr)
      .then((resp) => {
        msgs.clear();
        $scope.saveLock = false;
        if (resp.success) {
          add($scope.detector, filter, index);

          // console.log('save:', filter);
          $modalInstance.close();

        } else {
          msgs.error(resp.message);
        }
      });
  };

  $scope.cancel = function () {
    msgs.clear();
    $modalInstance.close();
  };
});
