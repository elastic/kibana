import _ from 'lodash';
import { map, forEach, last, indexOf } from 'lodash';

export class Sample {
  constructor(doc = {}) {
    this.doc = doc;
    this.state = Sample.states.UNKNOWN;
    this.description = '';
  }

  get model() {
    const result = {
      doc: this.doc,
      description: this.description
    };

    return result;
  }
}

Sample.states = {
  VALID: 'valid with current pipeline',
  INVALID: 'invalid with the current pipeline',
  UNKNOWN: 'has not yet been run against the current pipeline'
};

export class SampleCollection {
  constructor() {
    this.samples = [];
    this.index = -1;

    _.times(0, (index) => {
      this.add(new Sample({
        firstname: 'James',
        lastname: 'Unger',
        age: index + 1,
        address: '4214 S. Regal Manor Ct'
      }));

      const sample = this.samples[this.samples.length - 1];

      const rnd = _.random(1, 3);
      if (rnd === 1) sample.state = Sample.states.VALID;
      if (rnd === 2) sample.state = Sample.states.INVALID;
      if (rnd === 3) sample.state = Sample.states.UNKNOWN;

      if (_.random(1,5) === 1) {
        sample.description = `Description for document ${index + 1}`;
      }
    });
  }

  getCurrentSample() {
    if (this.index === -1) {
      return undefined;
    }

    return this.samples[this.index];
  }

  add(sample) {
    this.samples.push(sample);
    if (this.index = -1) {
      this.index = 0;
    }
  }

  replace(sample, newSample) {
    const index = indexOf(this.samples, sample);
    //_.pullAt(this.samples, index);
    this.samples.splice(index, 1, newSample);
  }

  remove(sample) {
    const index = indexOf(this.samples, sample);

    //TODO: Find out why remove wasn't working here!
    _.pullAt(this.samples, index);
    //_.remove(this.samples, sample);
  }

  addFromLogs(logLines, propertyName) {
    const splitRawSamples = ('' + logLines).split('\n');
    _.forEach(splitRawSamples, (sample) => {
      this.add(defaultObject(sample));
    });

    function defaultObject(sample) {
      const result = {};
      _.set(result, propertyName, sample);
      return result;
    }
  }

  applySimulateResults(simulateResults) {
    forEach(this.samples, (sample) => {
      sample.state = Sample.states.UNKNOWN;
    });

    forEach(simulateResults, (simulateResult, index) => {
      const sample = this.samples[index];
      const lastProcessorResult = last(simulateResult);
      if (lastProcessorResult && !lastProcessorResult.output) {
        sample.state = Sample.states.INVALID;
      } else {
        sample.state = Sample.states.VALID;
      }
    });
  }

  get model() {
    const result = map(this.samples, (sample) => {
      return sample.model;
    });

    return result;
  }
}
