/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { functionSpecs } from '../../../__tests__/fixtures/function_specs';
import { getAutocompleteSuggestions } from '../autocomplete';

describe('getAutocompleteSuggestions', () => {
  it('should suggest functions', () => {
    const suggestions = getAutocompleteSuggestions(functionSpecs, '', 0);
    expect(suggestions.length).to.be(functionSpecs.length);
    expect(suggestions[0].start).to.be(0);
    expect(suggestions[0].end).to.be(0);
  });

  it('should suggest functions filtered by text', () => {
    const expression = 'pl';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, 0);
    const nonmatching = suggestions.map(s => s.text).filter(text => !text.includes(expression));
    expect(nonmatching.length).to.be(0);
    expect(suggestions[0].start).to.be(0);
    expect(suggestions[0].end).to.be(expression.length);
  });

  it('should suggest arguments', () => {
    const expression = 'plot ';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const plotFn = functionSpecs.find(spec => spec.name === 'plot');
    expect(suggestions.length).to.be(Object.keys(plotFn.args).length);
    expect(suggestions[0].start).to.be(expression.length);
    expect(suggestions[0].end).to.be(expression.length);
  });

  it('should suggest arguments filtered by text', () => {
    const expression = 'plot axis';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const plotFn = functionSpecs.find(spec => spec.name === 'plot');
    const matchingArgs = Object.keys(plotFn.args).filter(key => key.includes('axis'));
    expect(suggestions.length).to.be(matchingArgs.length);
    expect(suggestions[0].start).to.be('plot '.length);
    expect(suggestions[0].end).to.be('plot axis'.length);
  });

  it('should suggest values', () => {
    const expression = 'shape shape=';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
    expect(suggestions.length).to.be(shapeFn.args.shape.options.length);
    expect(suggestions[0].start).to.be(expression.length);
    expect(suggestions[0].end).to.be(expression.length);
  });

  it('should suggest values filtered by text', () => {
    const expression = 'shape shape=ar';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
    const matchingValues = shapeFn.args.shape.options.filter(key => key.includes('ar'));
    expect(suggestions.length).to.be(matchingValues.length);
    expect(suggestions[0].start).to.be(expression.length - 'ar'.length);
    expect(suggestions[0].end).to.be(expression.length);
  });

  it('should suggest functions inside an expression', () => {
    const expression = 'if {}';
    const suggestions = getAutocompleteSuggestions(
      functionSpecs,
      expression,
      expression.length - 1
    );
    expect(suggestions.length).to.be(functionSpecs.length);
    expect(suggestions[0].start).to.be(expression.length - 1);
    expect(suggestions[0].end).to.be(expression.length - 1);
  });

  it('should suggest arguments inside an expression', () => {
    const expression = 'if {lt }';
    const suggestions = getAutocompleteSuggestions(
      functionSpecs,
      expression,
      expression.length - 1
    );
    const ltFn = functionSpecs.find(spec => spec.name === 'lt');
    expect(suggestions.length).to.be(Object.keys(ltFn.args).length);
    expect(suggestions[0].start).to.be(expression.length - 1);
    expect(suggestions[0].end).to.be(expression.length - 1);
  });

  it('should suggest values inside an expression', () => {
    const expression = 'if {shape shape=}';
    const suggestions = getAutocompleteSuggestions(
      functionSpecs,
      expression,
      expression.length - 1
    );
    const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
    expect(suggestions.length).to.be(shapeFn.args.shape.options.length);
    expect(suggestions[0].start).to.be(expression.length - 1);
    expect(suggestions[0].end).to.be(expression.length - 1);
  });

  it('should suggest values inside quotes', () => {
    const expression = 'shape shape="ar"';
    const suggestions = getAutocompleteSuggestions(
      functionSpecs,
      expression,
      expression.length - 1
    );
    const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
    const matchingValues = shapeFn.args.shape.options.filter(key => key.includes('ar'));
    expect(suggestions.length).to.be(matchingValues.length);
    expect(suggestions[0].start).to.be(expression.length - '"ar"'.length);
    expect(suggestions[0].end).to.be(expression.length);
  });

  it('should prioritize functions that start with text', () => {
    const expression = 't';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const tableIndex = suggestions.findIndex(suggestion => suggestion.text.includes('table'));
    const fontIndex = suggestions.findIndex(suggestion => suggestion.text.includes('font'));
    expect(tableIndex).to.be.lessThan(fontIndex);
  });

  it('should prioritize functions that match the previous function type', () => {
    const expression = 'plot | ';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const renderIndex = suggestions.findIndex(suggestion => suggestion.text.includes('render'));
    const anyIndex = suggestions.findIndex(suggestion => suggestion.text.includes('any'));
    expect(renderIndex).to.be.lessThan(anyIndex);
  });

  it('should alphabetize functions', () => {
    const expression = '';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const metricIndex = suggestions.findIndex(suggestion => suggestion.text.includes('metric'));
    const anyIndex = suggestions.findIndex(suggestion => suggestion.text.includes('any'));
    expect(anyIndex).to.be.lessThan(metricIndex);
  });

  it('should prioritize arguments that start with text', () => {
    const expression = 'plot y';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const yaxisIndex = suggestions.findIndex(suggestion => suggestion.text.includes('yaxis'));
    const defaultStyleIndex = suggestions.findIndex(suggestion =>
      suggestion.text.includes('defaultStyle')
    );
    expect(yaxisIndex).to.be.lessThan(defaultStyleIndex);
  });

  it('should prioritize unnamed arguments', () => {
    const expression = 'case ';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const whenIndex = suggestions.findIndex(suggestion => suggestion.text.includes('when'));
    const thenIndex = suggestions.findIndex(suggestion => suggestion.text.includes('then'));
    expect(whenIndex).to.be.lessThan(thenIndex);
  });

  it('should alphabetize arguments', () => {
    const expression = 'plot ';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    const yaxisIndex = suggestions.findIndex(suggestion => suggestion.text.includes('yaxis'));
    const defaultStyleIndex = suggestions.findIndex(suggestion =>
      suggestion.text.includes('defaultStyle')
    );
    expect(defaultStyleIndex).to.be.lessThan(yaxisIndex);
  });

  it('should quote string values', () => {
    const expression = 'shape shape=';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    expect(suggestions[0].text.trim()).to.match(/^".*"$/);
  });

  it('should not quote sub expression value suggestions', () => {
    const expression = 'plot font=';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    expect(suggestions[0].text.trim()).to.be('{font}');
  });

  it('should not quote booleans', () => {
    const expression = 'font underline=true';
    const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
    expect(suggestions[0].text.trim()).to.be('true');
  });
});
