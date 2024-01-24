/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { createRandomSamplerWrapper } from './random_sampler_wrapper';

/**
 * List of default probabilities to use for random sampler
 */
export const RANDOM_SAMPLER_PROBABILITIES = [
  0.00001, 0.00005, 0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5,
].map((n) => n * 100);

/**
 * Default recommended minimum probability for default sampling
 */
export const MIN_SAMPLER_PROBABILITY = 0.00001;

/**
 * Default step minimum probability for default sampling
 */
export const RANDOM_SAMPLER_STEP = MIN_SAMPLER_PROBABILITY * 100;

/**
 * Default probability to use
 */
export const DEFAULT_PROBABILITY = 0.001;

/**
 * Default options for random sampler
 */
export const RANDOM_SAMPLER_OPTION = {
  ON_AUTOMATIC: 'on_automatic',
  ON_MANUAL: 'on_manual',
  OFF: 'off',
} as const;

/**
 * Default option for random sampler type
 */
export type RandomSamplerOption =
  (typeof RANDOM_SAMPLER_OPTION)[keyof typeof RANDOM_SAMPLER_OPTION];

/**
 * Type for the random sampler probability
 */
export type RandomSamplerProbability = number | null;

/**
 * Class that helps manage random sampling settings
 * Automatically calculates the probability if only total doc count is provided
 * Else, use the probability that was explicitly set
 */
export class RandomSampler {
  private docCount$ = new BehaviorSubject<number>(0);
  private mode$ = new BehaviorSubject<RandomSamplerOption>(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);
  private probability$ = new BehaviorSubject<RandomSamplerProbability>(DEFAULT_PROBABILITY);
  private setRandomSamplerModeInStorage?: (mode: RandomSamplerOption) => void;
  private setRandomSamplerProbabilityInStorage?: (prob: RandomSamplerProbability) => void;

  /**
   * Initial values
   * @param {RandomSamplerOption} randomSamplerMode - random sampler mode
   * @param setRandomSamplerMode - callback to be called when random sampler mode is set
   * @param randomSamplerProbability - initial value for random sampler probability
   * @param setRandomSamplerProbability - initial setter for random sampler probability
   */
  constructor(
    randomSamplerMode?: RandomSamplerOption,
    setRandomSamplerMode?: (mode: RandomSamplerOption) => void,
    randomSamplerProbability?: RandomSamplerProbability,
    setRandomSamplerProbability?: (prob: RandomSamplerProbability) => void
  ) {
    if (randomSamplerMode) this.mode$.next(randomSamplerMode);

    if (setRandomSamplerMode) this.setRandomSamplerModeInStorage = setRandomSamplerMode;
    if (randomSamplerProbability) this.probability$.next(randomSamplerProbability);
    if (setRandomSamplerProbability)
      this.setRandomSamplerProbabilityInStorage = setRandomSamplerProbability;
  }

  /**
   * Set total doc count
   * If probability is not explicitly set, this doc count is used for calculating the suggested probability for sampling
   * @param docCount - total document count
   */
  setDocCount(docCount: number) {
    return this.docCount$.next(docCount);
  }

  /**
   * Get doc count
   */
  getDocCount() {
    return this.docCount$.getValue();
  }
  /**
   * Set and save in storage what mode of random sampling to use
   * @param {RandomSamplerOption} mode - mode to use when wrapping/unwrapping random sampling aggs
   */
  public setMode(mode: RandomSamplerOption) {
    if (this.setRandomSamplerModeInStorage) {
      this.setRandomSamplerModeInStorage(mode);
    }
    return this.mode$.next(mode);
  }

  /**
   * Observable to get currently set mode of random sampling
   */
  public getMode$() {
    return this.mode$.asObservable();
  }

  /**
   * Helper to get currently set mode of random sampling
   */
  public getMode() {
    return this.mode$.getValue();
  }

  /**
   * Helper to set the probability to use for random sampling requests
   * @param {RandomSamplerProbability} probability - numeric value 0 < probability < 1 to use for random sampling
   */
  public setProbability(probability: RandomSamplerProbability) {
    if (this.setRandomSamplerProbabilityInStorage) {
      this.setRandomSamplerProbabilityInStorage(probability);
    }
    return this.probability$.next(probability);
  }

  /**
   * Observability to get the probability to use for random sampling requests
   */
  public getProbability$() {
    return this.probability$.asObservable();
  }

  /**
   * Observability to get the probability to use for random sampling requests
   */
  public getProbability() {
    return this.probability$.getValue();
  }

  /**
   * Helper to return factory to extend any ES aggregations with the random sampling probability
   * Returns wrapper = {wrap, unwrap}
   * Where {wrap} extends the ES aggregations with the random sampling probability
   * And {unwrap} accesses the original ES aggregations directly
   */
  public createRandomSamplerWrapper() {
    const mode = this.getMode();
    const probability = this.getProbability();

    let prob = {};
    if (mode === RANDOM_SAMPLER_OPTION.ON_MANUAL) {
      prob = { probability };
    } else if (mode === RANDOM_SAMPLER_OPTION.OFF) {
      prob = { probability: 1 };
    }

    const wrapper = createRandomSamplerWrapper({
      ...prob,
      totalNumDocs: this.getDocCount(),
    });
    this.setProbability(wrapper.probability);
    return wrapper;
  }
}
