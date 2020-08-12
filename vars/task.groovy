def call(Closure closure) {
  withTaskQueue.addTask(closure)
}

return this
