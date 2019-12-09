/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../mock';
import { ProcessDraggable, ProcessDraggableWithNonExistentProcess } from './process_draggable';

describe('ProcessDraggable', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <ProcessDraggable
          contextId="context-123"
          endgamePid={456}
          endgameProcessName="endgame-process-name-123"
          eventId="event-123"
          processExecutable="process-executable-1"
          processName="process-name-1"
          processPid={123}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if everything is null', () => {
      const wrapper = shallow(
        <ProcessDraggable
          contextId="context-123"
          endgamePid={null}
          endgameProcessName={null}
          eventId="event-123"
          processExecutable={null}
          processName={null}
          processPid={null}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns null if everything is undefined', () => {
      const wrapper = shallow(
        <ProcessDraggable
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns process name if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName="[process-name]"
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it returns process executable if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns process pid if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable={null}
            processName={null}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('(123)');
    });

    test('it returns just process name if process.pid and endgame.pid are NaN', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable=""
            processName="[process-name]"
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it returns just process executable if process.pid and endgame.pid are NaN', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns process executable if everything else is an empty string or NaN', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName=""
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns endgame.process_name if everything else is an empty string or NaN', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[endgame-process_name]');
    });

    test('it returns endgame.process_name and endgame.pid if everything else is an empty string or undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={456}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[endgame-process_name](456)');
    });

    test('it returns process pid if everything else is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={456}
            endgameProcessName=""
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('(123)');
    });

    test('it returns endgame.pid if everything else is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={456}
            endgameProcessName=""
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('(456)');
    });

    test('it returns pid and process name if everything is filled', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={456}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName="[process-name]"
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name](123)');
    });

    test('it returns process pid and executable and if process name and endgame process name are null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable](123)');
    });

    test('it returns endgame pid and executable and if process name and endgame process name are null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={456}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable](456)');
    });

    test('it returns process pid and executable and if process name is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={undefined}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable](123)');
    });

    test('it returns process pid and executable if process name is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName=""
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable](123)');
    });

    test('it prefers process.name when process.executable and endgame.process_name are also provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName="[process-name]"
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it falls back to rendering process.executable when process.name is NOT provided, but process.executable and endgame.process_name are provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it falls back to rendering endgame.process_name when process.name and process.executable are NOT provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[endgame-process-name]');
    });

    test('it prefers process.pid when endgame.pid is also provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={999}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('(123)');
    });

    test('it falls back to rendering endgame.pid when process.pid is NOT provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            endgamePid={999}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('(999)');
    });
  });
});

describe('ProcessDraggableWithNonExistentProcess', () => {
  test('it renders the expected text when all fields are undefined', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('an unknown process');
  });

  test('it renders the expected text when just endgamePid is provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={999}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('(999)');
  });

  test('it renders the expected text when just endgameProcessName is provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName="[endgameProcessName]"
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[endgameProcessName]');
  });

  test('it renders the expected text when just processExecutable is provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable="[processExecutable]"
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[processExecutable]');
  });

  test('it renders the expected text when just processName is provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName="[processName]"
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[processName]');
  });

  test('it renders the expected text when just processPid is provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={123}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('(123)');
  });

  test('it renders the expected text when all values are provided', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          contextId="context-123"
          endgamePid={999}
          endgameProcessName="[endgameProcessName]"
          eventId="event-123"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[processName](123)');
  });
});
