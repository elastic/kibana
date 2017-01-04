import _ from 'lodash';
import ProcessorCollection from 'ui/pipelines/processor_collection/view_model';
import { SampleCollection } from 'ui/pipelines/sample_collection/view_model';

export default class Pipeline {
  constructor(processorRegistry, model) {
    ProcessorCollection.resetIdCounters(processorRegistry);

    const defaultModel = {
      pipelineId: '',
      description: '',
      failureAction: 'index_fail'
    };

    _.defaults(
      this,
      _.pick(model, _.keys(defaultModel)),
      defaultModel
    );

    this.processorCollection = new ProcessorCollection(
      processorRegistry,
      'Main Pipeline',
      _.get(model, 'processors'),
      ProcessorCollection.types.MAIN
    );
    this.failureProcessorCollection = new ProcessorCollection(
      processorRegistry,
      'Global Failure',
      _.get(model, 'failureProcessors'),
      ProcessorCollection.types.GLOBAL_FAILURE
    );
    this.sampleCollection = new SampleCollection({
      samples: _.get(model, 'samples'),
      index: _.get(model, 'sampleIndex')
    });

    this.processorRegistry = processorRegistry;
    this.processorCollections = [];
    this.activeProcessorCollection = this.processorCollection;
    this.input = {};
    this.output = undefined;
    this.dirty = false;
    this.hasCompileError = false;
    this.globalFailureProcessorIds = [];
    this.outputControlsState = { enableShowChanges: false, enableExpand: false };


    this.failureOptions = {
      index_fail: 'Do not index document',
      on_error: 'Execute other processors'
    };
  }

  get model() {
    const result = {
      pipelineId: this.pipelineId,
      description: this.description,
      failureAction: this.failureAction,
      failureProcessors: this.failureProcessorCollection.model,
      processors: this.processorCollection.model,
      samples: this.sampleCollection.model,
      sampleIndex: this.sampleCollection.index
    };

    return result;
  }

  setDirty() {
    this.dirty = true;
  }

  ///TODO: Rename this function
  pushProcessorCollection(processorCollection) {
    if (this.activeProcessorCollection === processorCollection) return;

    this.processorCollections.push(this.activeProcessorCollection);
    this.activeProcessorCollection = processorCollection;
  }

  ///TODO: Rename this function
  jumpToProcessorCollection(index) {
    while (this.processorCollections.length > index) {
      this.activeProcessorCollection = this.processorCollections.pop();
    }
  }

  updateOutput(allProcessors, simulateResults) {
    allProcessors = allProcessors || {};

    if (_.isEmpty(allProcessors)) {
      this.output = { doc: this.input, meta: {} };
      this.error = false;
    } else {
      const lastResult = _.last(simulateResults);
      const lastProcessor = allProcessors[_.get(lastResult, 'processorId')];

      this.output = _.get(lastProcessor, 'outputObject');
      this.error = _.get(lastProcessor, 'causeIndexFail');
    }

    this.dirty = false;
  }

  // Updates the state of the pipeline and processors with the results
  // from an ingest simulate call.
  applySimulateResults(simulateResults) {
    this.sampleCollection.applySimulateResults(simulateResults);

    const currentSampleResults = simulateResults[this.sampleCollection.index];
    const allProcessors = this.allProcessors;
    const allResults = {};

    _.forEach(currentSampleResults, result => {
      allResults[result.processorId] = result;
    });

    _.forEach(allProcessors, (processor) => {
      processor.setSimulateResult(allResults[processor.processorId]);
    });

    //TODO: Do I want to get rid of the `input` property, and instead completely
    //rely on the sampleCollection.getCurrentSample?
    this.processorCollection.applySimulateResults({ doc: this.input, meta: {} });

    const failureProcessorId = _.get(this.failureProcessorCollection, 'processors[0].failureProcessorId');
    const failureProcessor = allProcessors[failureProcessorId];
    const failureSourceInput = failureProcessor ? failureProcessor.inputObject : undefined;
    this.failureProcessorCollection.applySimulateResults(failureSourceInput);

    this.updateOutput(allProcessors, currentSampleResults);
  }

  get allProcessors() {
    return _.assign(
      this.processorCollection.allProcessors,
      this.failureProcessorCollection.allProcessors);
  }
}

function getObjectMeta(lastResult) {
  if (!_.has(lastResult, 'ingestMeta')) {
    return undefined;
  }

  const defaultMeta = {
    '_index': '_index',
    '_id': '_id',
    '_type': '_type'
  };

  const result = {};
  _.forIn(lastResult.ingestMeta, (value, key) => {
    if (defaultMeta[key] !== value) {
      _.set(result, key, value);
    }
  });

  return result;
}
