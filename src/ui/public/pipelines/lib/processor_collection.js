import _ from 'lodash';

export default class ProcessorCollection {

  constructor(processorRegistry, title, processors, type, parentProcessor) {
    this.title = title;
    this.type = type;
    this.valueField;
    this.processors = [];
    this.input = {};
    this.parentProcessor = parentProcessor;

    this.processorRegistry = processorRegistry;
    this.ProcessorTypes = {};

    this.ProcessorTypes = processorRegistry.byId;

    const collection = this;
    _.forEach(processors, (processorModel) => {
      collection.add(null, processorModel);
    });
    this.updateParents();
  }

  get allProcessors() {
    return _.reduce(this.processors, (result, processor) => {
      return _.assign(result, processor.allProcessors);
    }, {});
  }

  add(typeId, processorModel) {
    typeId = _.get(processorModel, 'typeId') || typeId;

    const processorId = _.get(processorModel, 'processorId') || ProcessorCollection.generateId(typeId);
    ProcessorCollection.useId(processorId);

    const ProcessorType = this.ProcessorTypes[typeId].ViewModel;
    const newProcessor = new ProcessorType(this.processorRegistry, processorId, processorModel);

    if (processorModel) {
      newProcessor.new = false;
      newProcessor.collapsed = true;
    } else {
      if (this.type === ProcessorCollection.types.FOREACH) {
        if (newProcessor.mainField) {
          _.set(newProcessor, newProcessor.mainField, '_ingest._value');

          //since we're defaulting the mainField, this should be included in the results.
          newProcessor.new = false;
        }
      }
    }

    this.processors.push(newProcessor);

    this.updateParents();

    return newProcessor;
  }

  remove(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    processors.splice(index, 1);

    this.updateParents();
  }

  moveUp(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    if (index === 0) return;

    const temp = processors[index - 1];
    processors[index - 1] = processors[index];
    processors[index] = temp;

    this.updateParents();
  }

  moveDown(processor) {
    const processors = this.processors;
    const index = processors.indexOf(processor);

    if (index === processors.length - 1) return;

    const temp = processors[index + 1];
    processors[index + 1] = processors[index];
    processors[index] = temp;

    this.updateParents();
  }

  updateParents() {
    this.processors.forEach((processor, index) => {
      const newParent = index > 0 ? this.processors[index - 1] : null;
      processor.setParent(newParent);
    });
  }

  applySimulateResults(rootInput) {
    _.forEach(this.processors, (processor) => {
      processor.applySimulateResults(rootInput);
    });
  }

  get output() {
    const lastValidProcessor = _.findLast(this.processors, (processor) => !!processor.output);
    return lastValidProcessor ? lastValidProcessor.output : undefined;
  }

  get model() {
    const result = [];
    let newFlag = false;

    _.forEach(this.processors, (processor) => {
      if (processor.new) {
        newFlag = true;
      }

      if (!newFlag) {
        result.push(processor.model);
      }
    });

    return result;
  }

}


ProcessorCollection.types = {
  MAIN: 'main processors',
  PROCESSOR_FAILURE: 'processor failure branch',
  GLOBAL_FAILURE: 'global failure branch',
  FOREACH: 'foreach branch'
};

ProcessorCollection.usedProcessorIds = [];
ProcessorCollection.resetIdCounters = function (processorRegistry) {
  ProcessorCollection.usedProcessorIds = [];
  ProcessorCollection.processorCounters = {};
  _.forIn(processorRegistry.byId, (registryItem, id) => {
    ProcessorCollection.processorCounters[id] = 0;
  });
};

ProcessorCollection.generateId = function (typeId) {
  if (!_.has(ProcessorCollection.processorCounters, typeId)) {
    return undefined;
  }

  let processorId;
  do {
    const processorCounter = ProcessorCollection.processorCounters[typeId] += 1;
    processorId = `${typeId}_${processorCounter}`;
  } while (_.includes(ProcessorCollection.usedProcessorIds, processorId));

  return processorId;
};

ProcessorCollection.useId = function (processorId) {
  ProcessorCollection.usedProcessorIds.push(processorId);
};
