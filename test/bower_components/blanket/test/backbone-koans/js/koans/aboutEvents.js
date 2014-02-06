
module('About Backbone.Events', {
    setup: function() {
        this.obj = {};
        _.extend(this.obj, Backbone.Events);
        this.obj.unbind(); // remove all custom events before each spec is run.
    }
});

test('Can extend javascript objects to support custom events.', function() {

    expect(3);
    var basicObject = {};

    // How would you give basicObject these functions?
    // Hint: http://documentcloud.github.com/backbone/#Events

    _.extend(basicObject, Backbone.Events);

    equal(typeof basicObject.bind, 'function');
    equal(typeof basicObject.unbind, 'function');
    equal(typeof basicObject.trigger, 'function');
});



test('Allows us to bind and trigger custom named events on an object.', function() {

    expect(1);

    var callback = this.spy();

    this.obj.bind('basic event', callback);

    this.obj.trigger("basic event");
    // How would you cause the callback for this custom event to be called?

    ok(callback.called);

});


test('Also passes along any arguments to the callback when an event is triggered.', function() {

    expect(1);

    var passedArgs = [];

    this.obj.bind('some event', function() {
        for (var i = 0; i < arguments.length; i++) {
            passedArgs.push(arguments[i]);
        }
    });

    this.obj.trigger('some event', 'arg1', 'arg2');

    deepEqual(passedArgs, ['arg1', 'arg2']);
});


test('Can also bind the passed context to the event callback.', function() {

    expect(1);

    var foo = { color: 'blue' };

    var changeColor = function() {
        this.color = 'red';
    }

    // How would you get 'this.color' to refer to 'foo' in the changeColor function?
    this.obj.bind('an event', changeColor, foo);
    this.obj.trigger('an event');

    equal(foo.color, 'red');

});


test("Uses 'all' as a special event name to capture all events bound to the object.", function() {

    expect(2);

    var callback = this.spy();

    this.obj.bind('all', callback);

    this.obj.trigger("custom event 1");
    this.obj.trigger("custom event 2");

    equal(callback.callCount, 2);
    equal(callback.getCall(0).args[0], 'custom event 1');

});


test('Also can remove custom events from objects.', function() {

    expect(5);
    
    var spy1 = this.spy();
    var spy2 = this.spy();
    var spy3 = this.spy();

    this.obj.bind('foo', spy1);
    this.obj.bind('foo', spy2);
    this.obj.bind('foo', spy3);
    this.obj.bind('bar', spy1);

    // How do you unbind just a single callback for the event?
    this.obj.unbind('foo', spy1);
    this.obj.trigger('foo');

    ok(spy2.called);

    // How do you unbind all callbacks tied to the event with a single method
    this.obj.unbind('foo');
    this.obj.trigger('foo');


    ok(spy2.callCount, 1);
    ok(spy2.calledOnce, "Spy 2 called once");
    ok(spy3.calledOnce, "Spy 3 called once");

    // How do you unbind all callbacks and events tied to the object with a single method?
    this.obj.unbind('bar');

    this.obj.trigger('bar');

    equal(spy1.callCount, 0);
 


});

