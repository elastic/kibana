# createTaskStoreUpdateBuffer
Creates a sort of `middleware` which sits between a Task Store and an entity which wants to call the store's `update` method, such as the Task Runner.
This `middleware` creates a buffer which allows us to batch up all the calls made to `update` and then executes them all using a single `bulkUpdate` call.

## How We Supporting Individual Calls
The entities calling the store's `update` method have no idea that their calls are being buffered.
They "think" they're calling `update` directly and expect to receive a Promise that will resolve/reject according to the result of the `store.update` method.

The way the `middleware` handles this is that each call creates a `Promise` which is returned to the caller.
It then holds on to the `resolve` and `reject` callbacks on the promise, associates them with the specific _task_ that was passed to the `update` call and pushes a tupple containing all three of them (_task_, `resolve` and `reject`) into an _Rxjs Stream_ (more on this in a moment).

When the buffer handles the `bulkUpdate` it uses the result for each _task_ to call the appropriate handler and either `resolve` or `reject` that task's promise.

# How We Buffer Calls
We haven't reinvented the wheel here, rather we use Rxjs's built in support for buffering.
Each tupple  (_task_, `resolve`, `reject`) is pushed into a single long lived Rxjs stream.
On this stream we're using a `bufferWhen` operator which tells Rxjs to buffer all the values pushed into that stream _until a certain event occurs_.
Hypothetically, this would buffer for ever until such an event occurs, but at that very moment when we push a new _task_ into the buffer, we also schedule a `setImmediate`to fire this event.
This means that whenever a new task is pushed into the buffer, we'll `flush` the buffer by the end of the current _Node event loop cycle_.

# Why Do We Filter Out Empty Tasks flushes?
As we're _flushing_ for every new task that's pushed into the buffer, we might find that by the time the flush event is responded to (on the next Node tick), we would have processed the task as part of a previously flushed buffer.
This is to be expected as we'll often call `store.update` multiple times within the same eventloop cycle and we _wish_ for these to be bulked up into one update -- this isn't a bug, it's a feature.

When this happens we're perfectly happy to just ignore these buffer flushes so we filter them out.