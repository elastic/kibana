/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import {
  LifecycleFlyoutCoordinationProvider,
  useLifecycleFlyoutCoordination,
  useRegisterLifecycleFlyoutOpen,
} from './lifecycle_flyout_coordination';

interface RegistrantSpec {
  id: string;
  isOpen: boolean;
}

const Registrant = ({ id, isOpen }: RegistrantSpec) => {
  useRegisterLifecycleFlyoutOpen(id, isOpen);
  return null;
};

const Reporter = ({ checkId }: { checkId: string | string[] }) => {
  const { isAnyFlyoutOpen, isAnyOtherFlyoutOpen, isFlyoutOpen } = useLifecycleFlyoutCoordination();
  return (
    <>
      <div data-test-subj="isAnyFlyoutOpen">{String(isAnyFlyoutOpen)}</div>
      <div data-test-subj="isAnyOtherFlyoutOpen">{String(isAnyOtherFlyoutOpen(checkId))}</div>
      <div data-test-subj="isFlyoutOpen">
        {String(isFlyoutOpen(Array.isArray(checkId) ? checkId[0] : checkId))}
      </div>
    </>
  );
};

const Harness = ({
  registrants,
  checkId,
}: {
  registrants: RegistrantSpec[];
  checkId: string | string[];
}) => (
  <LifecycleFlyoutCoordinationProvider>
    {registrants.map((r) => (
      <Registrant key={r.id} id={r.id} isOpen={r.isOpen} />
    ))}
    <Reporter checkId={checkId} />
  </LifecycleFlyoutCoordinationProvider>
);

describe('lifecycle flyout coordination', () => {
  it('throws when used outside a LifecycleFlyoutCoordinationProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useLifecycleFlyoutCoordination();
      } catch (error) {
        return error as Error;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('LifecycleFlyoutCoordinationProvider');
  });

  it('reports no flyouts open by default', () => {
    render(<Harness registrants={[]} checkId="a" />);

    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('false');
  });

  it("excludes the caller's own id from isAnyOtherFlyoutOpen", () => {
    render(<Harness registrants={[{ id: 'a', isOpen: true }]} checkId="a" />);

    // Only "a" is open, so a component checking against its own id "a" is not blocked...
    expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('false');
    // ...but the registry as a whole does have something open.
    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('true');
  });

  it('blocks a different id while "a" is open', () => {
    render(<Harness registrants={[{ id: 'a', isOpen: true }]} checkId="b" />);

    expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('true');
  });

  it('treats multiple simultaneously-registered flyouts as blocking each other', () => {
    render(
      <Harness
        registrants={[
          { id: 'a', isOpen: true },
          { id: 'b', isOpen: true },
        ]}
        checkId="a"
      />
    );

    // Even checking against its own id, "b" being open means "a" is still blocked.
    expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('true');
  });

  it('clears a flyout from the registry on unmount', () => {
    const { rerender } = render(<Harness registrants={[{ id: 'a', isOpen: true }]} checkId="b" />);

    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('true');

    // Simulate the registrant unmounting (e.g. the stream navigates away while its flyout is open).
    rerender(<Harness registrants={[]} checkId="b" />);

    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('false');
  });

  it('reflects isOpen toggling back to false without unmounting', () => {
    const { rerender } = render(<Harness registrants={[{ id: 'a', isOpen: true }]} checkId="b" />);

    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('true');

    rerender(<Harness registrants={[{ id: 'a', isOpen: false }]} checkId="b" />);

    expect(screen.getByTestId('isAnyFlyoutOpen')).toHaveTextContent('false');
  });

  describe('isFlyoutOpen', () => {
    it('reports false for an id that is not registered', () => {
      render(<Harness registrants={[]} checkId="a" />);

      expect(screen.getByTestId('isFlyoutOpen')).toHaveTextContent('false');
    });

    it('reports true for a specific id while it is open, regardless of other flyouts', () => {
      render(
        <Harness
          registrants={[
            { id: 'a', isOpen: true },
            { id: 'b', isOpen: true },
          ]}
          checkId="a"
        />
      );

      expect(screen.getByTestId('isFlyoutOpen')).toHaveTextContent('true');
    });

    it('reports false again once that id is cleared, even if other flyouts stay open', () => {
      const { rerender } = render(
        <Harness
          registrants={[
            { id: 'a', isOpen: true },
            { id: 'b', isOpen: true },
          ]}
          checkId="a"
        />
      );

      expect(screen.getByTestId('isFlyoutOpen')).toHaveTextContent('true');

      rerender(
        <Harness
          registrants={[
            { id: 'a', isOpen: false },
            { id: 'b', isOpen: true },
          ]}
          checkId="a"
        />
      );

      expect(screen.getByTestId('isFlyoutOpen')).toHaveTextContent('false');
    });
  });

  describe('isAnyOtherFlyoutOpen with an array of ids', () => {
    it("excludes every id in the array, not just the caller's own", () => {
      // Mirrors a component that owns "downsample-steps" but also treats the adjacent
      // "data-phases" flyout as non-blocking (it drives a special navigation mode instead).
      render(
        <Harness
          registrants={[{ id: 'data-phases', isOpen: true }]}
          checkId={['downsample-steps', 'data-phases']}
        />
      );

      expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('false');
    });

    it('still reports true when a flyout outside the exclusion list is open', () => {
      render(
        <Harness
          registrants={[{ id: 'successful-lifecycle', isOpen: true }]}
          checkId={['downsample-steps', 'data-phases']}
        />
      );

      expect(screen.getByTestId('isAnyOtherFlyoutOpen')).toHaveTextContent('true');
    });
  });
});
