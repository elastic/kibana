def call(List<Closure> closures) {
  withTaskQueue.addTasks(closures)
}

return this
