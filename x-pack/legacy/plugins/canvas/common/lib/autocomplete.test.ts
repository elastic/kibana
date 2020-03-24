/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');
import { functionSpecs } from '../../__tests__/fixtures/function_specs';

import {
  FunctionSuggestion,
  getAutocompleteSuggestions,
  getFnArgDefAtPosition,
} from './autocomplete';

describe('autocomplete', () => {
  describe('getFnArgDefAtPosition', () => {
    it('should return function definition for plot', () => {
      const expression = 'plot ';
      const def = getFnArgDefAtPosition(functionSpecs, expression, expression.length);
      const plotFn = functionSpecs.find(spec => spec.name === 'plot');
      expect(def.fnDef).toBe(plotFn);
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should suggest functions', () => {
      const suggestions = getAutocompleteSuggestions(functionSpecs, '', 0);
      expect(suggestions.length).toBe(functionSpecs.length);
      expect(suggestions[0].start).toBe(0);
      expect(suggestions[0].end).toBe(0);
    });

    it('should suggest arguments', () => {
      const expression = 'plot ';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const plotFn = functionSpecs.find(spec => spec.name === 'plot');
      expect(suggestions.length).toBe(Object.keys(plotFn!.args).length);
      expect(suggestions[0].start).toBe(expression.length);
      expect(suggestions[0].end).toBe(expression.length);
    });

    it('should suggest values', () => {
      const expression = 'shape shape=';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
      expect(suggestions.length).toBe(shapeFn!.args.shape.options.length);
      expect(suggestions[0].start).toBe(expression.length);
      expect(suggestions[0].end).toBe(expression.length);
    });

    it('should suggest functions inside an expression', () => {
      const expression = 'if {}';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      );
      expect(suggestions.length).toBe(functionSpecs.length);
      expect(suggestions[0].start).toBe(expression.length - 1);
      expect(suggestions[0].end).toBe(expression.length - 1);
    });

    it('should rank functions inside an expression by their return type first', () => {
      const expression = 'plot defaultStyle={}';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      ) as FunctionSuggestion[];
      expect(suggestions.length).toBe(functionSpecs.length);
      expect(suggestions[0].fnDef.name).toBe('seriesStyle');
    });

    it('should rank functions inside an expression with matching return types and contexts before just return type', () => {
      const expression = 'staticColumn "hello" | ply expression={}';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      ) as FunctionSuggestion[];
      expect(suggestions.length).toBe(functionSpecs.length);

      expect(suggestions[0].fnDef.type).toBe('datatable');
      expect(suggestions[0].fnDef.inputTypes).toEqual(['datatable']);

      const withReturnOnly = suggestions.findIndex(
        suggestion =>
          suggestion.fnDef.type === 'datatable' &&
          suggestion.fnDef.inputTypes &&
          !(suggestion.fnDef.inputTypes as string[]).includes('datatable')
      );

      const withNeither = suggestions.findIndex(
        suggestion =>
          suggestion.fnDef.type !== 'datatable' &&
          (!suggestion.fnDef.inputTypes ||
            !(suggestion.fnDef.inputTypes as string[]).includes('datatable'))
      );

      expect(suggestions[0].fnDef.type).toBe('datatable');
      expect(suggestions[0].fnDef.inputTypes).toEqual(['datatable']);

      expect(withReturnOnly).toBeLessThan(withNeither);
    });

    it('should suggest arguments inside an expression', () => {
      const expression = 'if {lt }';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      );
      const ltFn = functionSpecs.find(spec => spec.name === 'lt');
      expect(suggestions.length).toBe(Object.keys(ltFn!.args).length);
      expect(suggestions[0].start).toBe(expression.length - 1);
      expect(suggestions[0].end).toBe(expression.length - 1);
    });

    it('should suggest values inside an expression', () => {
      const expression = 'if {shape shape=}';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      );
      const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
      expect(suggestions.length).toBe(shapeFn!.args.shape.options.length);
      expect(suggestions[0].start).toBe(expression.length - 1);
      expect(suggestions[0].end).toBe(expression.length - 1);
    });

    it('should suggest values inside quotes', () => {
      const expression = 'shape shape="ar"';
      const suggestions = getAutocompleteSuggestions(
        functionSpecs,
        expression,
        expression.length - 1
      );
      const shapeFn = functionSpecs.find(spec => spec.name === 'shape');
      expect(suggestions.length).toBe(shapeFn!.args.shape.options.length);
      expect(suggestions[0].start).toBe(expression.length - '"ar"'.length);
      expect(suggestions[0].end).toBe(expression.length);
    });

    it('should prioritize functions that match the previous function type', () => {
      const expression = 'plot | ';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const renderIndex = suggestions.findIndex(suggestion => suggestion.text.includes('render'));
      const anyIndex = suggestions.findIndex(suggestion => suggestion.text.includes('any'));
      expect(renderIndex).toBeLessThan(anyIndex);
    });

    it('should alphabetize functions', () => {
      const expression = '';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const metricIndex = suggestions.findIndex(suggestion => suggestion.text.includes('metric'));
      const anyIndex = suggestions.findIndex(suggestion => suggestion.text.includes('any'));
      expect(anyIndex).toBeLessThan(metricIndex);
    });

    it('should prioritize unnamed arguments', () => {
      const expression = 'case ';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const whenIndex = suggestions.findIndex(suggestion => suggestion.text.includes('when'));
      const thenIndex = suggestions.findIndex(suggestion => suggestion.text.includes('then'));
      expect(whenIndex).toBeLessThan(thenIndex);
    });

    it('should alphabetize arguments', () => {
      const expression = 'plot ';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      const yaxisIndex = suggestions.findIndex(suggestion => suggestion.text.includes('yaxis'));
      const defaultStyleIndex = suggestions.findIndex(suggestion =>
        suggestion.text.includes('defaultStyle')
      );
      expect(defaultStyleIndex).toBeLessThan(yaxisIndex);
    });

    it('should quote string values', () => {
      const expression = 'shape shape=';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      expect(suggestions[0].text.trim()).toMatch(/^".*"$/);
    });

    it('should not quote sub expression value suggestions', () => {
      const expression = 'plot font=';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      expect(suggestions[0].text.trim()).toBe('{font}');
    });

    it('should not quote booleans', () => {
      const expression = 'table paginate=true';
      const suggestions = getAutocompleteSuggestions(functionSpecs, expression, expression.length);
      expect(suggestions[0].text.trim()).toBe('true');
    });
  });
});
