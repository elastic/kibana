/* global $, _, Backbone */
(function() {
    var TEMPLATE_URL = '';
    
    var NAUGHTY_WORDS = /crap|poop|hell|frogs/gi;
    
    function sanitize(str) {
        return str.replace(NAUGHTY_WORDS, 'rainbows');
    }
    
    window.Todo = Backbone.Model.extend({

        defaults: function() {
            return {
                text: '',
                done:  false,
                order: 0
            };
        },
        
        initialize: function() {
            this.set({text: sanitize(this.get('text'))}, {silent: true});
        },
        
        validate: function(attrs) {
            if (attrs.hasOwnProperty('done') && !_.isBoolean(attrs.done)) {
                return 'Todo.done must be a boolean value.';
            }
        },

        toggle: function() {
            this.save({done: !this.get("done")});
        }

    });

    window.TodoList = Backbone.Collection.extend({

        model: Todo,
        
        url: '/todos/',

        done: function() {
            return this.filter(function(todo) { return todo.get('done'); });
        },

        remaining: function() {
            return this.without.apply(this, this.done());
        },
        
        nextOrder: function() {
            if (!this.length) { 
                return 1; 
            }
            
            return this.last().get('order') + 1;
        },

        comparator: function(todo) {
            return todo.get('order');
        }

    });

    window.TodoView = Backbone.View.extend({

        tagName:  "li",

        events: {
            "click .check"              : "toggleDone",
            "dblclick div.todo-text"    : "edit",
            "click span.todo-destroy"   : "clear",
            "keypress .todo-input"      : "updateOnEnter"
        },

        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        render: function() {
            var self = this;
            
            
            $(self.el).empty().template(TEMPLATE_URL + '/templates/item.html', self.model.toJSON(), function() {
                self.setText();
            });


            
            return this;
        },

        setText: function() {
            var text = this.model.get('text');
            this.$('.todo-text').text(text);
            this.input = this.$('.todo-input');
            this.input.bind('blur', _.bind(this.close, this)).val(text);
        },

        toggleDone: function() {
            this.model.toggle();
        },

        edit: function() {
            $(this.el).addClass("editing");
            this.input.focus();
        },

        close: function() {
            this.model.save({text: this.input.val()});
            $(this.el).removeClass("editing");
        },

        updateOnEnter: function(e) {
            if (e.keyCode === 13) { this.close(); }
        },

        remove: function() {
            $(this.el).remove();
        },

        clear: function() {
            this.model.destroy();
        }

    });

    window.TodoApp = Backbone.View.extend({
        
        todos: new TodoList(),

        events: {
            "keypress #new-todo":  "createOnEnter",
            "keyup #new-todo":     "showTooltip",
            "click .todo-clear a": "clearCompleted"
        },

        initialize: function(options) {
            var self = this,
                parentElt = options.appendTo || $('body');
                
            TEMPLATE_URL = options.templateUrl || TEMPLATE_URL;
            
            
            parentElt.template(TEMPLATE_URL + '/templates/app.html', {}, function() {
                self.el = $('#todoapp');
                self.delegateEvents();
                
                self.input = self.$("#new-todo");

                self.todos.bind('add',   self.addOne, self);
                self.todos.bind('reset', self.addAll, self);
                self.todos.bind('all',   self.render, self);

                self.todos.fetch();
            });

        },

        render: function() {
            var self = this,
                data = {
                    total:      self.todos.length,
                    done:       self.todos.done().length,
                    remaining:  self.todos.remaining().length
                };
            
            $('#todo-stats').empty().template(TEMPLATE_URL + '/templates/stats.html', data);
            
            return this;
        },

        addOne: function(todo) {
            var view = new TodoView({model: todo});
            this.$("#todo-list").append(view.render().el);
        },

        addAll: function() {
            this.todos.each(this.addOne);
        },

        createOnEnter: function(e) {
            var text = this.input.val();
            
            if (!text || e.keyCode !== 13) {
                return;
            }
            
            this.todos.create({text: text, done: false, order: this.todos.nextOrder()});
            this.input.val('');
        },

        clearCompleted: function() {
            _.each(this.todos.done(), function(todo) { todo.destroy(); });
            return false;
        },

        showTooltip: function(e) {
            var tooltip = this.$(".ui-tooltip-top");
            var val = this.input.val();
            
            tooltip.fadeOut();
            
            if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); }
            if (val === '' || val == this.input.attr('placeholder')) { return; }
            
            var show = function() { tooltip.show().fadeIn(); };
            
            this.tooltipTimeout = _.delay(show, 1000);
        }
        
    });
    
}());
