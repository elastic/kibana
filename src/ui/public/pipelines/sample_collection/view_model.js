import _ from 'lodash';
import { cloneDeep, map, forEach, last, indexOf, get } from 'lodash';

export class Sample {
  constructor(model) {
    const defaultModel = {
      doc: {},
      state: Sample.states.VALID,
      description: ''
    };

    _.defaults(
      this,
      _.pick(model, _.keys(defaultModel)),
      defaultModel
    );
  }

  get model() {
    const result = {
      doc: cloneDeep(this.doc),
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
  constructor(model) {
    this.samples = [];
    forEach(get(model, 'samples'), (sampleModel) => {
      this.add(new Sample(sampleModel));
    });

    const defaultModel = {
      index: -1
    };

    _.defaults(
      this,
      _.pick(model, _.keys(defaultModel)),
      defaultModel
    );
  }

  getCurrentSample() {
    if (this.index === -1) {
      return undefined;
    }

    return this.samples[this.index];
  }

  add(sample) {
    this.samples.push(sample);
    if (this.index === -1) {
      this.setCurrent(sample);
    }
  }

  replace(sample, newSample) {
    const index = indexOf(this.samples, sample);
    if (index === -1) {
      this.add(newSample);
    } else {
      this.samples.splice(index, 1, newSample);
    }
  }

  setCurrent(sample) {
    const index = indexOf(this.samples, sample);
    this.index = index;
  }

  remove(sample) {
    const index = indexOf(this.samples, sample);
    _.pullAt(this.samples, index);

    if (this.samples.length === 0) {
      this.index = -1;
    } else if (this.index === index) {
      this.index = 0;
    }
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
