/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as selector from '../workpad';

describe('workpad selectors', () => {
  let asts;
  let state;

  beforeEach(() => {
    asts = {
      'element-0': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'markdown',
            arguments: {},
          },
        ],
      },
      'element-1': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'demodata',
            arguments: {},
          },
        ],
      },
      'element-3': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'demodata',
            arguments: {},
          },
          {
            type: 'function',
            function: 'dropdownControl',
            arguments: {
              valueColumn: ['project'],
              filterColumn: ['project'],
            },
          },
          {
            type: 'function',
            function: 'render',
            arguments: {},
          },
        ],
      },
      'element-4': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'timefilterControl',
            arguments: { compact: [true], column: ['@timestamp'] },
          },
        ],
      },
    };

    state = {
      transient: {
        selectedToplevelNodes: ['element-1'],
        resolvedArgs: {
          'element-0': 'test resolved arg, el 0',
          'element-1': 'test resolved arg, el 1',
          'element-2': {
            example1: 'first thing',
            example2: ['why not', 'an array?'],
            example3: {
              deeper: {
                object: true,
              },
            },
          },
        },
      },
      persistent: {
        workpad: {
          id: 'workpad-1',
          page: 0,
          pages: [
            {
              id: 'page-1',
              elements: [
                {
                  id: 'element-0',
                  expression: 'markdown',
                  filter: '',
                },
                {
                  id: 'element-1',
                  expression: 'demodata',
                  filter: '',
                },
                {
                  id: 'element-3',
                  expression:
                    'demodata | dropdownControl valueColumn=project filterColumn=project | render',
                  filter: 'exactly value="beats" column="project"',
                },
                {
                  id: 'element-4',
                  expression: 'timefilterControl compact=true column=@timestamp',
                  filter: 'timefilter filterGroup=one column=@timestamp from=now-24h to=now',
                },
              ],
            },
          ],
          isWriteable: false,
        },
      },
    };
  });

  describe('empty state', () => {
    it('returns undefined', () => {
      expect(selector.getSelectedPage({})).to.be(undefined);
      expect(selector.getPageById({}, 'page-1')).to.be(undefined);
      expect(selector.getSelectedElement({})).to.be(undefined);
      expect(selector.getElementById({}, 'element-1')).to.be(undefined);
      expect(selector.getResolvedArgs({}, 'element-1')).to.be(undefined);
      expect(selector.getSelectedResolvedArgs({})).to.be(undefined);
      expect(selector.isWriteable({})).to.be(true);
    });
  });

  describe('getSelectedPage', () => {
    it('returns the selected page', () => {
      expect(selector.getSelectedPage(state)).to.equal('page-1');
    });
  });

  describe('getPages', () => {
    it('return an empty array with no pages', () => {
      expect(selector.getPages({})).to.eql([]);
    });

    it('returns all pages in persisent state', () => {
      expect(selector.getPages(state)).to.eql(state.persistent.workpad.pages);
    });
  });

  describe('getPageById', () => {
    it('should return matching page', () => {
      expect(selector.getPageById(state, 'page-1')).to.eql(state.persistent.workpad.pages[0]);
    });
  });

  describe('getSelectedElement', () => {
    it('returns selected element', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getSelectedElement(state)).to.eql({
        ...elements[1],
        ast: asts['element-1'],
      });
    });
  });

  describe('getElements', () => {
    it('is an empty array with no state', () => {
      expect(selector.getElements({})).to.eql([]);
    });

    it('returns all elements on the page', () => {
      const { elements } = state.persistent.workpad.pages[0];

      const expected = elements.map(element => ({
        ...element,
        ast: asts[element.id],
      }));
      expect(selector.getElements(state)).to.eql(expected);
    });
  });

  describe('getElementById', () => {
    it('returns element matching id', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getElementById(state, 'element-0')).to.eql({
        ...elements[0],
        ast: asts['element-0'],
      });
      expect(selector.getElementById(state, 'element-1')).to.eql({
        ...elements[1],
        ast: asts['element-1'],
      });
    });
  });

  describe('getResolvedArgs', () => {
    it('returns resolved args by element id', () => {
      expect(selector.getResolvedArgs(state, 'element-0')).to.equal('test resolved arg, el 0');
    });

    it('returns resolved args at given path', () => {
      const arg = selector.getResolvedArgs(state, 'element-2', 'example1');
      expect(arg).to.equal('first thing');
    });
  });

  describe('getSelectedResolvedArgs', () => {
    it('returns resolved args for selected element', () => {
      expect(selector.getSelectedResolvedArgs(state)).to.equal('test resolved arg, el 1');
    });

    it('returns resolved args at given path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedToplevelNodes: ['element-2'],
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, 'example2');
      expect(arg).to.eql(['why not', 'an array?']);
    });

    it('returns resolved args at given deep path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedToplevelNodes: ['element-2'],
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, ['example3', 'deeper', 'object']);
      expect(arg).to.be(true);
    });
  });

  describe('getGlobalFilters', () => {
    it('gets filters from all elements', () => {
      const filters = selector.getGlobalFilters(state);
      expect(filters).to.eql([
        'exactly value="beats" column="project"',
        'timefilter filterGroup=one column=@timestamp from=now-24h to=now',
      ]);
    });

    it('gets returns empty array with no elements', () => {
      const filters = selector.getGlobalFilters({});
      expect(filters).to.be.an(Array);
      expect(filters).to.have.length(0);
    });
  });

  describe('getGlobalFilterGroups', () => {
    it('gets filter group from elements', () => {
      const filterGroups = selector.getGlobalFilterGroups(state);
      expect(filterGroups).to.be.an(Array);
      expect(filterGroups).to.have.length(1);
      expect(filterGroups[0]).to.equal('one');
    });

    it('gets all unique filter groups', () => {
      const filterGroups = selector.getGlobalFilterGroups({
        persistent: {
          workpad: {
            pages: [
              {
                elements: [
                  { filter: 'exactly value=beats column=project' },
                  { filter: 'exactly filterGroup=one value=complete column=state' },
                  { filter: 'timefilter filterGroup=one column=@timestamp from=now-24h to=now' },
                  { filter: 'timefilter filterGroup=two column=timestamp from=now-15m to=now' },
                  { filter: 'timefilter column=_timestamp from=now-30m to=now' },
                ],
              },
            ],
          },
        },
      });

      // filters are alphabetical
      expect(filterGroups).to.eql(['one', 'two']);
    });

    it('gets filter groups in filter function args', () => {
      const filterGroups = selector.getGlobalFilterGroups({
        persistent: {
          workpad: {
            pages: [
              {
                elements: [
                  { filter: 'exactly filterGroup=one value=complete column=state' },
                  { filter: 'timefilter column=timestamp from=now-15m to=now' },
                  {
                    expression: 'filters {string two} | demodata {filters three}',
                    filter: 'exactly filterGroup=four value=pending column=state',
                  },
                  {
                    expression: 'demodata {filters one}',
                  },
                ],
              },
            ],
          },
        },
      });

      // {string two} is skipped, only primitive values are extracted
      // filterGroup=one and {filters one} are de-duped
      // filters are alphabetical
      expect(filterGroups).to.eql(['four', 'one', 'three']);
    });
  });

  describe('isWriteable', () => {
    it('returns boolean for if the workpad is writeable', () => {
      expect(selector.isWriteable(state)).to.equal(false);
    });
  });
});
