# **Take With Backpressure** rxjs Operator

The **Take With Backpressure** module provides an Rx.js Operator which can be used against any stream using a pipe, like any standard operator.

For Example:
```ts
import { of, from } from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { takeWithBackpressure, TAKE_RESULT } from './take_with_backpressure';

of(1, 2, 3)
        .pipe(
          takeWithBackpressure(acceptTheValue(2), 3),
          mergeAll()
        )
        .subscribe(
          ([result, x]: [TAKE_RESULT, number]) => {
            switch (x) {
              case 1:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
              case 2:
                expect(result).toEqual(TAKE_RESULT.TAKEN);
                break;
              case 3:
                expect(result).toEqual(TAKE_RESULT.TAKE_REJECTED);
                break;
            }
          }
        );
```

## Intent
Imagine you have a stream of _subjects_ coming through and you wish to queue them up such that you only want to consume a certain amount.
Hypothetically this could be achieves by using the build in _take_ operator, but _take_ consumes the required amount of subjects indiscriminately, without giving you a way of picking which to take.
The other _take_ operators, such as _takeUntil_ and _takeWhile_ provide mechanisms for discriminating, but they can't handle _asynchronous_ methods of validation and if you begin an async operation they skip your subject and consume the next.


`takeWithBackpressure` provides a way of _taking_ in a similar manner, but provides a mechanism for backpressure, so that the stream _holds off_ while you validate whether or not you wish to _take_ a certain subject.

## Real World Use
The real use triggering the need for this operator is for parallelising the Task Manager's need to claim ownership of tasks by requesting said ownership from Elasticsearch.

When Task Manager queries Elasticsearch for a list of tasks to run, it has to cycle through each one of those tasks and _claim ownership_ of them by making a call to Elasticsearch in which it marks the task as being run.

The `claimOwnership` operation has three possible results:
1. It returns a positive response, confirming ownership has been taken.
1. It returns a negative response, notifying Task Manager that their ownership claim was rejected.
1. It throws an error indicating something has gone wrong.

If a positive response is returned, we wish to _take_ this task and operate on it, if a negative response is returned we wish to skip this task and move to the next and if an error is thrown, we wish to short circuit the process and handle just the tasks already _taken_.

Complicating things further, we don't want a single Task Manager to take on too many tasks, so we provide a _capacity_ of workers, and Task Manager can only handle as many concurrent tasks as it has workers.

To address this model, the `takeWithBackpressure` abstracts away the internal logic and asks the developer to provide two arguments:
1. An asynchronous `takeValidator` function which promises to return a `boolean` indicating whether the _subject_ should be _taken_
1. A `capacity` of subjects to _take_ out of the input stream.

## Implementation Considerations
There are several things to note about how this has been implemented:

### Results
All subjects are taken by the queue, as we often wish act upon the subjects that haven't been taken.

To model this, each subject is returned as part of a 2-tuple, where the left value in the tuple is a `result` and the right is the `subject` themselves.

For example, given a stream of numbers `1...2...3...4...5`, if your `takeValidator` accepts all even numbers, and your `capacity` is one (meaning, only one _subject_ will be _taken_), your stream should be transformed into the following stream: `[TAKE_RESULT.TAKE_REJECTED,1]...[TAKE_RESULT.TAKEN,2]...[TAKE_RESULT.RAN_OUT_OF_CAPACITY,3]...[TAKE_RESULT.RAN_OUT_OF_CAPACITY,4]...[TAKE_RESULT.RAN_OUT_OF_CAPACITY,5]`.

This allows you to handle all the subjects in the stream as needed, but it also means that if you wish to only receive the subject's successfully _taken_, then you need to `filter` and `map` appropriately.

For example:
```ts
import { takeWithBackpressure, TAKE_RESULT } from 'take_with_backpressure';

function hasBeenTaken<T>([result]: [TAKE_RESULT, T]) {
  return result === TAKE_RESULT.TAKEN;
}

function shouldTake(subject){ ... }

from(allSubjects)
        .pipe(
          takeWithBackpressure(shouldTake, this.availableWorkers),
          mergeAll(),
          filter(hasBeenTaken),
          map(([, subject]) => subject)
        )
        .subscribe(
          subject => {
            // subject has been taken successfully
          }
        );
```

### Short Circuit
If any of the calls of `takeValidator` result in an exception, this will cause the operator to _short circuit_.
What this means is that all subsequent subjects coming through the stream will be _skipped_.

Any _subject_ which has already been pulled out of the incoming stream will continue to be processed, even if their async call to `takeValidator` completes after the exception happened.
The reason we've decided to allow these subjects to be _taken_ without issue, is that as far as the `takeValidator` operation is concerned, this subject _has been taken_, which means that if it has side effects (such as in our Task Manager), then we would end up in a mixed up state where `takeValidator` thinks the value has been taken, but in practice it hasn't.

The short-circuiting will cause the subscription to result in an `error` as expected in any standard Observable operator.
