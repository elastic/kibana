module('About Backbone.Collection');

test('Can add Model instances as objects and arrays.', function() {

    expect(3);

    var todos = new TodoList();
    equal(todos.length, 0);

    todos.add({ text: 'Clean the kitchen' });
    equal(todos.length, 1);

    todos.add([
        { text: 'Do the laundry', done: true }, 
        { text: 'Go to the gym'}
    ]);

    equal(todos.length, 3);
});

test('Can have a url property to define the basic url structure for all contained models.', function() {
    expect(1);
    var todos = new TodoList();
    equal(todos.url, '/todos/');
});

test('Fires custom named events when the models change.', function() {

    expect(2);
    var todos = new TodoList();

    var addModelCallback = this.spy();
    var removeModelCallback = this.spy();

    todos.bind('add', addModelCallback);
    todos.bind('remove', removeModelCallback);

    // How would you get the 'add' event to trigger?
    todos.add({text:"New todo"});

    ok(addModelCallback.called);

    // How would you get the 'remove' callback to trigger?
    todos.remove(todos.last());

    ok(removeModelCallback.called);

});